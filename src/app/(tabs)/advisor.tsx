import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GlassCard from '../../components/common/GlassCard';
import ImageCard, { ImageReference } from '../../components/ImageCard';
import { COLORS, ROUNDING } from '../../constants/theme';
import { getTtsUrl, sendAdvisoryMessage, sendMultiLLMQuery, translateMessagesBatch } from '../../services/advisoryService';
import { useAppStore } from '../../store/appStore';
import { determineSeason, determineZone, getMonthName } from '../../utils/contextHelper';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  translations?: {
    en?: string;
    si?: string;
    [key: string]: string | undefined;
  };
  sources?: string[];
  images?: ImageReference[];
  context_used?: string;
  timestamp: string;
  // Multi-LLM fields
  isMultiLlm?: boolean;
  best_model?: string;
  judge_reason?: string;
  consensus_score?: number;
  llama_answer?: string;
  llama8b_answer?: string;
  gemma_answer?: string;
  qwen_answer?: string;
  // Early exit optimization fields
  early_exit?: boolean;
  similarity_score?: number;
  latency_ms?: number;
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function AdvisorScreen() {
  const { t } = useTranslation();
  const language = useAppStore(state => state.language);
  const setLanguage = useAppStore(state => state.setLanguage);

  const [sessionId, setSessionId] = useState<string>(() => generateUUID());
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const handleEditQuestion = (msg: Message) => {
    setEditingMsgId(msg.id);
    setInputText(msg.text);
    setTimeout(() => textInputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingMsgId(null);
    setInputText('');
  };

  const toggleLanguage = async () => {
    const nextLang = language === 'en' ? 'si' : 'en';
    const currentLang = language;
    await setLanguage(nextLang);

    // Find messages that don't have the translation cached
    const messagesToTranslate: { id: string; text: string }[] = [];
    messages.forEach(msg => {
      if (msg.id === 'welcome') return;

      // If standard or Multi-LLM text is not cached
      if (!msg.translations?.[nextLang]) {
        const textToTranslate = msg.translations?.['en'] || msg.translations?.['si'] || msg.text;
        messagesToTranslate.push({ id: msg.id + "_text", text: textToTranslate });
      }

      if (msg.isMultiLlm) {
        // Check LLaMA
        if (!msg.translations?.[`llama_${nextLang}`] && msg.llama_answer) {
          messagesToTranslate.push({ id: msg.id + "_llama", text: msg.llama_answer });
        }
        // Check LLaMA 8B
        if (!msg.translations?.[`llama8b_${nextLang}`] && msg.llama8b_answer) {
          messagesToTranslate.push({ id: msg.id + "_llama8b", text: msg.llama8b_answer });
        }
        // Check Gemma
        const gemmaAns = msg.gemma_answer || msg.qwen_answer;
        if (!msg.translations?.[`gemma_${nextLang}`] && !msg.translations?.[`qwen_${nextLang}`] && gemmaAns) {
          messagesToTranslate.push({ id: msg.id + "_gemma", text: gemmaAns });
        }
        // Check Judge Reason
        if (!msg.translations?.[`reason_${nextLang}`] && msg.judge_reason) {
          messagesToTranslate.push({ id: msg.id + "_reason", text: msg.judge_reason });
        }
      }
    });

    if (messagesToTranslate.length === 0) {
      // All translations cached, just switch text
      setMessages(prev => prev.map(msg => {
        if (msg.id === 'welcome') return msg;

        let updatedMsg = {
          ...msg,
          text: msg.translations?.[nextLang] || msg.text
        };

        if (msg.isMultiLlm) {
          updatedMsg = {
            ...updatedMsg,
            llama_answer: msg.translations?.[`llama_${nextLang}`] || msg.llama_answer,
            llama8b_answer: msg.translations?.[`llama8b_${nextLang}`] || msg.llama8b_answer,
            gemma_answer: msg.translations?.[`gemma_${nextLang}`] || msg.translations?.[`qwen_${nextLang}`] || msg.gemma_answer || msg.qwen_answer,
            qwen_answer: msg.translations?.[`gemma_${nextLang}`] || msg.translations?.[`qwen_${nextLang}`] || msg.gemma_answer || msg.qwen_answer,
            judge_reason: msg.translations?.[`reason_${nextLang}`] || msg.judge_reason,
          };
        }

        return updatedMsg;
      }));
      return;
    }

    setTranslating(true);
    try {
      const result = await translateMessagesBatch(messagesToTranslate, nextLang);
      if (result.success) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === 'welcome') return msg;
          
          const cachedTranslations = { ...(msg.translations || {}) };
          
          // Cache current text if not saved yet
          if (!cachedTranslations[currentLang]) {
            cachedTranslations[currentLang] = msg.text;
          }
          if (msg.isMultiLlm) {
            if (!cachedTranslations[`llama_${currentLang}`]) {
              cachedTranslations[`llama_${currentLang}`] = msg.llama_answer;
            }
            if (!cachedTranslations[`llama8b_${currentLang}`]) {
              cachedTranslations[`llama8b_${currentLang}`] = msg.llama8b_answer;
            }
            const gemmaAns = msg.gemma_answer || msg.qwen_answer;
            if (!cachedTranslations[`gemma_${currentLang}`] && gemmaAns) {
              cachedTranslations[`gemma_${currentLang}`] = gemmaAns;
            }
            if (!cachedTranslations[`qwen_${currentLang}`] && gemmaAns) {
              cachedTranslations[`qwen_${currentLang}`] = gemmaAns;
            }
            if (!cachedTranslations[`reason_${currentLang}`]) {
              cachedTranslations[`reason_${currentLang}`] = msg.judge_reason;
            }
          }

          // 1. Text translation
          const textTrans = result.translations.find((t: any) => t.id === msg.id + "_text" || t.id === msg.id);
          if (textTrans) {
            cachedTranslations[nextLang] = textTrans.translated_text;
          }

          let updatedMsg = {
            ...msg,
            text: cachedTranslations[nextLang] || msg.text,
            translations: cachedTranslations
          };

          if (msg.isMultiLlm) {
            // 2. LLaMA translation
            const llamaTrans = result.translations.find((t: any) => t.id === msg.id + "_llama");
            if (llamaTrans) {
              cachedTranslations[`llama_${nextLang}`] = llamaTrans.translated_text;
            }
            // 3. LLaMA 8B translation
            const llama8bTrans = result.translations.find((t: any) => t.id === msg.id + "_llama8b");
            if (llama8bTrans) {
              cachedTranslations[`llama8b_${nextLang}`] = llama8bTrans.translated_text;
            }
            // 4. Gemma translation
            const gemmaTrans = result.translations.find((t: any) => t.id === msg.id + "_gemma" || t.id === msg.id + "_qwen");
            if (gemmaTrans) {
              cachedTranslations[`gemma_${nextLang}`] = gemmaTrans.translated_text;
              cachedTranslations[`qwen_${nextLang}`] = gemmaTrans.translated_text;
            }
            // 5. Judge Reason translation
            const reasonTrans = result.translations.find((t: any) => t.id === msg.id + "_reason");
            if (reasonTrans) {
              cachedTranslations[`reason_${nextLang}`] = reasonTrans.translated_text;
            }

            updatedMsg = {
              ...updatedMsg,
              llama_answer: cachedTranslations[`llama_${nextLang}`] || msg.llama_answer,
              llama8b_answer: cachedTranslations[`llama8b_${nextLang}`] || msg.llama8b_answer,
              gemma_answer: cachedTranslations[`gemma_${nextLang}`] || cachedTranslations[`qwen_${nextLang}`] || msg.gemma_answer || msg.qwen_answer,
              qwen_answer: cachedTranslations[`gemma_${nextLang}`] || cachedTranslations[`qwen_${nextLang}`] || msg.gemma_answer || msg.qwen_answer,
              judge_reason: cachedTranslations[`reason_${nextLang}`] || msg.judge_reason,
            };
          }

          return updatedMsg;
        }));
      }
    } catch (err) {
      console.warn("Failed to translate previous messages:", err);
      // Fallback: load from cache if available
      setMessages(prev => prev.map(msg => {
        if (msg.id === 'welcome') return msg;

        let updatedMsg = {
          ...msg,
          text: msg.translations?.[nextLang] || msg.text
        };

        if (msg.isMultiLlm) {
          updatedMsg = {
            ...updatedMsg,
            llama_answer: msg.translations?.[`llama_${nextLang}`] || msg.llama_answer,
            llama8b_answer: msg.translations?.[`llama8b_${nextLang}`] || msg.llama8b_answer,
            gemma_answer: msg.translations?.[`gemma_${nextLang}`] || msg.translations?.[`qwen_${nextLang}`] || msg.gemma_answer || msg.qwen_answer,
            qwen_answer: msg.translations?.[`gemma_${nextLang}`] || msg.translations?.[`qwen_${nextLang}`] || msg.gemma_answer || msg.qwen_answer,
            judge_reason: msg.translations?.[`reason_${nextLang}`] || msg.judge_reason,
          };
        }

        return updatedMsg;
      }));
    } finally {
      setTranslating(false);
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: language === 'en'
        ? "Hello! I am your SaruPol AI Farming Advisor. I can answer any questions about coconut cultivation, pest controls, diseases, or fertilizer schedules. Ask me anything!"
        : "ආයුබෝවන්! මම සරුපොල් AI වගා උපදේශකයා වෙමි. පොල් වගාව, පළිබෝධ පාලනය, රෝග හෝ පොහොර යෙදීම් පිළිබඳ ඕනෑම ගැටලුවක් මගෙන් විමසන්න.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Keep welcome message translated dynamically when language switches
  React.useEffect(() => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === 'welcome') {
        return {
          ...msg,
          text: language === 'en'
            ? "Hello! I am your SaruPol AI Farming Advisor. I can answer any questions about coconut cultivation, pest controls, diseases, or fertilizer schedules. Ask me anything!"
            : "ආයුබෝවන්! මම සරුපොල් AI වගා උපදේශකයා වෙමි. පොල් වගාව, පළිබෝධ පාලනය, රෝග හෝ පොහොර යෙදීම් පිළිබඳ ඕනෑම ගැටලුවක් මගෙන් විමසන්න."
        };
      }
      return msg;
    }));
  }, [language]);
  const [inputText, setInputText] = useState('');
  const [chatMode, setChatMode] = useState<'standard' | 'multi'>('standard');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [expandedMultiLlmMsgIds, setExpandedMultiLlmMsgIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Audio Playback States for TTS
  const [activeAudioMsgId, setActiveAudioMsgId] = useState<string | null>(null);
  const [audioLoadingMsgId, setAudioLoadingMsgId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const stopAudio = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (err) {
        console.warn("Error stopping audio:", err);
      }
      soundRef.current = null;
    }
    setActiveAudioMsgId(null);
    setAudioLoadingMsgId(null);
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      void stopAudio();
    }
  };

  const toggleAudio = async (msgId: string, text: string) => {
    // If the clicked audio is already playing, stop it (toggle off)
    if (activeAudioMsgId === msgId) {
      await stopAudio();
      return;
    }

    // Stop currently playing audio if any
    if (soundRef.current) {
      await stopAudio();
    }

    setAudioLoadingMsgId(msgId);
    try {
      // Configure audio session for device
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });

      const url = getTtsUrl(text, language);
      if (__DEV__) console.log("Fetching TTS audio from endpoint:", url.split('?')[0]);

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setActiveAudioMsgId(msgId);
    } catch (err) {
      console.warn("Failed to play TTS audio:", err);
      setActiveAudioMsgId(null);
    } finally {
      setAudioLoadingMsgId(null);
    }
  };

  // Stop audio on component unmount to prevent leaks
  React.useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch((err: unknown) => console.log("Clean up sound error", err));
      }
    };
  }, []);

  React.useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      const currentDate = new Date();
      const currentSeason = determineSeason(currentDate);
      const currentMonth = getMonthName(currentDate);

      let currentZone = 'Unknown Zone';
      if (status === 'granted') {
        try {
          // Attempt to get last known location first (cached, resolves instantly)
          let location = await Location.getLastKnownPositionAsync({});

          if (!location) {
            // Fallback to active query with balanced accuracy for fast response
            location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced
            });
          }

          if (location) {
            currentZone = determineZone(location.coords.latitude, location.coords.longitude);
            setUserCoords({ lat: location.coords.latitude, lon: location.coords.longitude });
          }
        } catch (error) {
          console.log("Error getting location", error);
        }
      }

      const contextString = `${currentZone} | ${currentSeason} Season (${currentMonth})`;
      setUserContext(contextString);
    })();
  }, []);

  // Suggested questions chips (related to English/Sinhala PDFs in our knowledge base)
  const suggestions = [
    language === 'en' ? "How should I fertilize young coconut palms?" : "පොල් පැළ සඳහා පොහොර යෙදිය යුත්තේ කෙසේද?",
    language === 'en' ? "How do I select a good mother palm?" : "හොඳ මව් ශාකයක් තෝරා ගන්නේ කෙසේද?",
    language === 'en' ? "How do I control termites in coconut nursery?" : "පොල් තවාන් වල වේයන් පාලනය කරන්නේ කෙසේද?",
    language === 'en' ? "What fertilizer mixture is recommended for coconut seedlings?" : "පොල් පැළ සඳහා නිර්දේශිත පොහොර මිශ්‍රණය කුමක්ද?"
  ];

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    if (editingMsgId) {
      setMessages(prev => {
        const targetIdx = prev.findIndex(m => m.id === editingMsgId);
        if (targetIdx !== -1) {
          return prev.slice(0, targetIdx);
        }
        return prev;
      });
      setEditingMsgId(null);
    }

    const isSinhalaInput = /[\u0D80-\u0DFF]/.test(trimmed);
    const detectedLang = isSinhalaInput ? 'si' : 'en';

    // Add User Message
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: trimmed,
      translations: {
        [detectedLang]: trimmed
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    // Auto Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      if (chatMode === 'multi') {
        const response = await sendMultiLLMQuery(trimmed, userCoords?.lat, userCoords?.lon, language);
        if (response.success) {
          const gemmaAns = response.gemma_answer || response.qwen_answer;
          const botMsg: Message = {
            id: Math.random().toString(),
            sender: 'bot',
            text: response.best_answer,
            translations: {
              [language]: response.best_answer,
              [`llama_${language}`]: response.llama_answer,
              [`llama8b_${language}`]: response.llama8b_answer,
              [`gemma_${language}`]: gemmaAns,
              [`qwen_${language}`]: gemmaAns,
              [`reason_${language}`]: response.reason,
            },
            sources: response.sources ? response.sources.map((s: any) => s.title) : [],
            images: response.images || [],
            context_used: response.zone ? `${response.zone} | ${response.season}` : undefined,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMultiLlm: true,
            best_model: response.best_model,
            judge_reason: response.reason,
            consensus_score: response.consensus_score,
            llama_answer: response.llama_answer,
            llama8b_answer: response.llama8b_answer,
            gemma_answer: gemmaAns,
            qwen_answer: gemmaAns,
            early_exit: response.early_exit ?? false,
            similarity_score: response.similarity_score ?? null,
            latency_ms: response.latency_ms ?? null,
          };
          setMessages(prev => [...prev, botMsg]);
        }
      } else {
        const response = await sendAdvisoryMessage(
          trimmed,
          userContext,
          language,
          sessionId,
          userCoords?.lat,
          userCoords?.lon
        );

        if (response.session_id) {
          setSessionId(response.session_id);
        }

        // If backend returned translated question in Sinhala, update user question message
        if (response.question && language === 'si' && !isSinhalaInput) {
          setMessages(prev => prev.map(m => m.id === userMsg.id ? {
            ...m,
            text: response.question,
            translations: { ...m.translations, si: response.question }
          } : m));
        }

        const botMsg: Message = {
          id: Math.random().toString(),
          sender: 'bot',
          text: response.answer,
          translations: {
            [language]: response.answer
          },
          sources: response.sources ? response.sources.map((s: any) => s.title) : [],
          images: response.images || [],
          context_used: response.context_used,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: language === 'en'
          ? "Sorry, I am facing connectivity issues to my knowledge base. Please check your internet connection."
          : "සමාවන්න, උපදේශන සේවාව සමඟ සම්බන්ධ වීමට අපොහොසත් විය. කරුණාකර අන්තර්ජාලය පරීක්ෂා කරන්න.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleSuggestionPress = (question: string) => {
    handleSend(question);
  };


  const startNewChat = () => {
    const newSessionId = generateUUID();
    setSessionId(newSessionId);
    setEditingMsgId(null);
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: language === 'en'
          ? "Hello! I am your SaruPol AI Farming Advisor. I can answer any questions about coconut cultivation, pest controls, diseases, or fertilizer schedules. Ask me anything!"
          : "ආයුබෝවන්! මම සරුපොල් AI වගා උපදේශකයා වෙමි. පොල් වගාව, පළිබෝධ පාලනය, රෝග හෝ පොහොර යෙදීම් පිළිබඳ ඕනෑම ගැටලුවක් මගෙන් විමසන්න.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInputText('');
    setLoading(false);
  };

  const toggleMultiLlmExpand = (msgId: string) => {
    setExpandedMultiLlmMsgIds(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('advisor.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={startNewChat} style={styles.iconOnlyDeleteButton} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={COLORS.diseased} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleLanguage}
            style={styles.langButton}
            disabled={translating}
          >
            {translating ? (
              <ActivityIndicator size="small" color={COLORS.textSecondary} style={{ width: 36, height: 16 }} />
            ) : (
              <Text style={styles.langText}>
                {language === 'en' ? 'සිංහල' : 'English'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode Switcher Segment */}
      <View style={styles.modeContainer}>
        <TouchableOpacity
          style={[styles.modeTab, chatMode === 'standard' && styles.modeTabActive]}
          onPress={() => setChatMode('standard')}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={chatMode === 'standard' ? COLORS.textPrimary : COLORS.textSecondary} />
          <Text style={[styles.modeTabText, chatMode === 'standard' && styles.modeTabTextActive]}>
            {language === 'en' ? 'AI Chat' : 'AI සංවාදය'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, chatMode === 'multi' && styles.modeTabActive]}
          onPress={() => setChatMode('multi')}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={chatMode === 'multi' ? COLORS.textPrimary : COLORS.textSecondary} />
          <Text style={[styles.modeTabText, chatMode === 'multi' && styles.modeTabTextActive]}>
            {t('validate.title')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Context Banner */}
      {userContext && (
        <View style={styles.contextBanner}>
          <Ionicons name="location" size={14} color={COLORS.primaryLight} />
          <Text style={styles.contextBannerText}>{userContext}</Text>
        </View>
      )}

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.sender === 'user' ? styles.rowUser : styles.rowBot
            ]}
          >
            {msg.sender === 'user' ? (
              <View style={styles.userBubbleWrapper}>
                <View style={styles.userBubble}>
                  <View style={styles.userBubbleHeader}>
                    <Text style={styles.userSenderLabel}>
                      {language === 'en' ? 'You' : 'ඔබ'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleEditQuestion(msg)}
                      style={styles.userEditButton}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="create-outline" size={12} color="#FFFFFF" />
                      <Text style={styles.userEditText}>
                        {language === 'en' ? 'Edit' : 'සංස්කරණය'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.userText}>{msg.text}</Text>
                  <Text style={styles.userTime}>{msg.timestamp}</Text>
                </View>
              </View>
            ) : (
              <GlassCard style={[styles.botBubble, msg.isMultiLlm && styles.botBubbleMultiLlm]}>
                {msg.isMultiLlm && (
                  <View style={styles.earlyExitBadgeRow}>
                    {msg.early_exit ? (
                      <View style={styles.earlyExitBadge}>
                        <Ionicons name="flash" size={12} color="#66BB6A" />
                        <Text style={styles.earlyExitBadgeText}>
                          {language === 'en' ? 'Fast Validated' : 'ඉක්මන් සත්‍යාපනය'}
                        </Text>
                        {msg.similarity_score != null && (
                          <View style={styles.similarityChip}>
                            <Text style={styles.similarityChipText}>
                              {Math.round(msg.similarity_score * 100)}% {language === 'en' ? 'match' : 'ගැලපීම'}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.bestAnswerBadge}>
                        <Ionicons name="shield-checkmark" size={12} color={COLORS.healthy} />
                        <Text style={styles.bestAnswerBadgeText}>
                          {language === 'en' ? 'Best Answer Selected' : 'තෝරාගත් හොඳම පිළිතුර'}
                        </Text>
                      </View>
                    )}
                    {msg.latency_ms != null && (
                      <View style={styles.latencyChip}>
                        <Ionicons name="timer-outline" size={10} color={COLORS.textSecondary} />
                        <Text style={styles.latencyChipText}>{msg.latency_ms}ms</Text>
                      </View>
                    )}
                  </View>
                )}

                <Text style={styles.botText}>{msg.text}</Text>

                {/* Multi-LLM Accordion Expansion */}
                {msg.isMultiLlm && (
                  <View style={styles.multiLlmSection}>
                    <TouchableOpacity
                      style={styles.expandToggleButton}
                      onPress={() => toggleMultiLlmExpand(msg.id)}
                    >
                      <Ionicons
                        name={expandedMultiLlmMsgIds[msg.id] ? "chevron-up-circle-outline" : "chevron-down-circle-outline"}
                        size={16}
                        color={COLORS.accentLight}
                      />
                      <Text style={styles.expandToggleText}>
                        {expandedMultiLlmMsgIds[msg.id]
                          ? (language === 'en' ? 'Hide Comparison Details' : 'සංසන්දනාත්මක විස්තර සඟවන්න')
                          : (language === 'en' ? 'View 3 Model Answers & Judgment' : 'ආකෘති 3හි පිළිතුරු සහ විනිශ්චය බලන්න')}
                      </Text>
                    </TouchableOpacity>

                    {expandedMultiLlmMsgIds[msg.id] && (
                      <View style={styles.multiLlmDetails}>
                        {/* Consensus Score */}
                        {msg.consensus_score !== undefined && (() => {
                          let consensusColor = COLORS.healthy;
                          let consensusLabel = language === 'en' ? 'High Agreement' : 'ඉහළ එකඟතාව';
                          if (msg.consensus_score < 50) {
                            consensusColor = COLORS.diseased;
                            consensusLabel = language === 'en' ? 'Low Agreement' : 'අඩු එකඟතාව';
                          } else if (msg.consensus_score < 80) {
                            consensusColor = COLORS.warning;
                            consensusLabel = language === 'en' ? 'Moderate Agreement' : 'මධ්‍යම එකඟතාව';
                          }
                          return (
                            <View style={styles.inlineConsensus}>
                              <View style={styles.inlineConsensusHeader}>
                                <Text style={styles.inlineConsensusLabel}>
                                  {language === 'en' ? 'Model Consensus:' : 'ආකෘති එකඟතාව:'} <Text style={{ color: consensusColor, fontWeight: '800' }}>{consensusLabel}</Text>
                                </Text>
                                <Text style={[styles.inlineConsensusScore, { color: consensusColor }]}>{msg.consensus_score}%</Text>
                              </View>
                              <View style={styles.inlineScoreBarBg}>
                                <View style={[styles.inlineScoreBarFill, { width: `${msg.consensus_score}%`, backgroundColor: consensusColor }]} />
                              </View>
                            </View>
                          );
                        })()}

                        {/* Model response snippets */}
                        <Text style={styles.inlineSectionTitle}>{language === 'en' ? 'Individual Model Answers:' : 'ආකෘති මට්ටමින් පිළිතුරු:'}</Text>

                        {/* LLaMA 3.3 */}
                        {msg.llama_answer && (() => {
                          const isBest = msg.best_model === 'llama';
                          return (
                            <View style={[styles.inlineModelRow, isBest && styles.inlineModelRowBest]}>
                              <View style={styles.inlineModelHeader}>
                                <Text style={styles.inlineModelIcon}>🦙</Text>
                                <Text style={[styles.inlineModelName, { color: '#7C4DFF' }]}>LLaMA 3.3 70B</Text>
                                {isBest && <Text style={styles.inlineBestBadge}>✓ Selected</Text>}
                              </View>
                              <Text style={styles.inlineModelAnswer}>{msg.llama_answer}</Text>
                            </View>
                          );
                        })()}

                        {/* LLaMA 3.1 8B */}
                        {msg.llama8b_answer && (() => {
                          const isBest = msg.best_model === 'llama8b';
                          return (
                            <View style={[styles.inlineModelRow, isBest && styles.inlineModelRowBest]}>
                              <View style={styles.inlineModelHeader}>
                                <Text style={styles.inlineModelIcon}>💎</Text>
                                <Text style={[styles.inlineModelName, { color: '#00BCD4' }]}>LLaMA 3.1 8B</Text>
                                {isBest && <Text style={styles.inlineBestBadge}>✓ Selected</Text>}
                              </View>
                              <Text style={styles.inlineModelAnswer}>{msg.llama8b_answer}</Text>
                            </View>
                          );
                        })()}

                        {/* Gemma 2 9B */}
                        {(msg.gemma_answer || msg.qwen_answer) && (() => {
                          const isBest = msg.best_model === 'gemma' || msg.best_model === 'qwen';
                          const answerText = msg.gemma_answer || msg.qwen_answer;
                          return (
                            <View style={[styles.inlineModelRow, isBest && styles.inlineModelRowBest]}>
                              <View style={styles.inlineModelHeader}>
                                <Text style={styles.inlineModelIcon}>💎</Text>
                                <Text style={[styles.inlineModelName, { color: '#FF6D00' }]}>Gemma 2 9B</Text>
                                {isBest && <Text style={styles.inlineBestBadge}>✓ Selected</Text>}
                              </View>
                              <Text style={styles.inlineModelAnswer}>{answerText}</Text>
                            </View>
                          );
                        })()}

                        {/* Judge Reasoning */}
                        {msg.judge_reason && (
                          <View style={styles.inlineJudgment}>
                            <View style={styles.inlineJudgmentHeader}>
                              <Ionicons name="ribbon-outline" size={13} color={COLORS.accentLight} />
                              <Text style={styles.inlineJudgmentTitle}>{language === 'en' ? 'AI Judge Reasoning:' : 'AI විනිසුරු තර්කනය:'}</Text>
                            </View>
                            <Text style={styles.inlineJudgmentText}>{msg.judge_reason}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Context used */}
                {msg.context_used && (
                  <View style={styles.contextUsedContainer}>
                    <Text style={styles.contextUsedText}>
                      <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} /> {language === 'en' ? 'Context Used:' : 'භාවිතා කළ සන්දර්භය:'} {msg.context_used}
                    </Text>
                  </View>
                )}

                {/* Citations / Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <View style={styles.sourcesContainer}>
                    <Text style={styles.sourcesHeader}>
                      📚 {language === 'en' ? 'Verified Sources:' : 'සහතික කළ මූලාශ්‍ර:'}
                    </Text>
                    {msg.sources.map((src, i) => (
                      <Text key={i} style={styles.sourceText}>• {src}</Text>
                    ))}
                  </View>
                )}

                {/* CRI Reference Images */}
                {msg.images && msg.images.length > 0 && (
                  <View style={styles.imagesContainer}>
                    <Text style={styles.imagesHeader}>
                      📷 {language === 'en' ? 'Reference Images:' : 'යොමු රූප සටහන්:'}
                    </Text>
                    {msg.images.map((img, idx) => (
                      <ImageCard key={idx} image={img} />
                    ))}
                  </View>
                )}

                <View style={styles.botBubbleFooter}>
                  <TouchableOpacity
                    onPress={() => toggleAudio(msg.id, msg.text)}
                    style={styles.audioButton}
                    disabled={audioLoadingMsgId === msg.id}
                  >
                    {audioLoadingMsgId === msg.id ? (
                      <ActivityIndicator size="small" color={COLORS.primaryLight} style={{ marginRight: 4, transform: [{ scale: 0.8 }] }} />
                    ) : (
                      <Ionicons
                        name={activeAudioMsgId === msg.id ? "volume-mute-outline" : "volume-medium-outline"}
                        size={16}
                        color={activeAudioMsgId === msg.id ? COLORS.primaryLight : COLORS.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text style={[
                      styles.audioButtonText,
                      activeAudioMsgId === msg.id ? styles.audioActiveText : styles.audioInactiveText
                    ]}>
                      {activeAudioMsgId === msg.id
                        ? (language === 'en' ? 'Stop' : 'නවතන්න')
                        : (language === 'en' ? 'Listen' : 'සවන් දෙන්න')}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.botTime}>{msg.timestamp}</Text>
                </View>
              </GlassCard>
            )}
          </View>
        ))}

        {/* Loading Spinner for Response */}
        {loading && (
          <View style={styles.loadingRow}>
            <GlassCard style={styles.loadingCard}>
              <ActivityIndicator color={COLORS.primaryLight} size="small" />
              <Text style={styles.loadingText}>
                {language === 'en' ? 'Searching knowledge base...' : 'විශ්ලේෂණය කරමින් පවතී...'}
              </Text>
            </GlassCard>
          </View>
        )}
      </ScrollView>

      {/* Suggestion Chips Panel */}
      {!loading && messages.length <= 2 && (
        <View style={styles.suggestionsWrapper}>
          <Text style={styles.suggestionsLabel}>{t('advisor.suggestedQuestions')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
            {suggestions.map((s, i) => (
              <TouchableOpacity key={i} onPress={() => handleSuggestionPress(s)} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Message Inputs Footer */}
      <View style={styles.footer}>
        {editingMsgId && (() => {
          const editingMsg = messages.find(m => m.id === editingMsgId);
          return (
            <View style={styles.editingBanner}>
              <View style={styles.editingBannerHeader}>
                <View style={styles.editingBannerTitleRow}>
                  <View style={styles.editingIconBadge}>
                    <Ionicons name="create" size={12} color={COLORS.primaryLight} />
                  </View>
                  <Text style={styles.editingBannerTitle}>
                    {language === 'en' ? 'Editing Question' : 'ප්‍රශ්නය සංස්කරණය කිරීම'}
                  </Text>
                </View>
                <TouchableOpacity onPress={cancelEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              {editingMsg && (
                <Text style={styles.editingPreviewText} numberOfLines={1}>
                  "{editingMsg.text}"
                </Text>
              )}
            </View>
          );
        })()}
        <View style={styles.inputContainer}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('advisor.placeholder')}
            placeholderTextColor={COLORS.textMuted}
            onSubmitEditing={() => handleSend(inputText)}
          />
          <TouchableOpacity onPress={() => handleSend(inputText)} style={styles.sendButton}>
            <Ionicons name={editingMsgId ? "checkmark" : "send"} size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.12)',
    backgroundColor: COLORS.surface,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconOnlyDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: ROUNDING.full,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  langText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowBot: {
    justifyContent: 'flex-start',
  },
  userBubbleWrapper: {
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: 'rgba(46, 125, 50, 0.95)',
    borderRadius: ROUNDING.md,
    borderBottomRightRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  userBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.18)',
  },
  userSenderLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDING.full,
  },
  userEditText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  editingBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDING.md,
    padding: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.35)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editingBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editingBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editingIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editingBannerTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  editingPreviewText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 3,
  },
  botBubble: {
    maxWidth: '85%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 0,
  },
  botText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  sourcesContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.15)',
    paddingTop: 8,
  },
  sourcesHeader: {
    color: COLORS.accentLight,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sourceText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  imagesContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.15)',
    paddingTop: 8,
  },
  imagesHeader: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  botTime: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  botBubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: ROUNDING.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  audioButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  audioActiveText: {
    color: COLORS.primaryLight,
  },
  audioInactiveText: {
    color: COLORS.textSecondary,
  },
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  suggestionsWrapper: {
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.1)',
  },
  suggestionsLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  suggestionScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderColor: 'rgba(76, 175, 80, 0.25)',
    borderWidth: 1,
    borderRadius: ROUNDING.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    backgroundColor: COLORS.surface,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.15)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 94, 32, 0.08)',
    borderColor: 'rgba(76, 175, 80, 0.25)',
    borderWidth: 1,
    borderRadius: ROUNDING.full,
    paddingHorizontal: 16,
    height: 48,
  },
  textInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  sendButton: {
    backgroundColor: COLORS.primaryLight,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 94, 32, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.15)',
  },
  contextBannerText: {
    marginLeft: 8,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  contextUsedContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.15)',
  },
  contextUsedText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  // Mode Switcher Styles
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.12)',
    gap: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: ROUNDING.sm,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
    borderColor: COLORS.primaryLight,
  },
  modeTabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  // Inline Multi-LLM Bubble Styles
  botBubbleMultiLlm: {
    borderColor: COLORS.primaryLight,
    borderWidth: 1,
    maxWidth: '100%',
    width: '100%',
  },
  bestAnswerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(102, 187, 106, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
    borderColor: 'rgba(102, 187, 106, 0.3)',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  bestAnswerBadgeText: {
    color: COLORS.healthy,
    fontSize: 10,
    fontWeight: '700',
  },
  earlyExitBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  earlyExitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(102, 187, 106, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
    borderColor: 'rgba(102, 187, 106, 0.4)',
  },
  earlyExitBadgeText: {
    color: '#66BB6A',
    fontSize: 10,
    fontWeight: '800',
  },
  similarityChip: {
    backgroundColor: 'rgba(102, 187, 106, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: ROUNDING.full,
    marginLeft: 2,
  },
  similarityChipText: {
    color: '#81C784',
    fontSize: 9,
    fontWeight: '700',
  },
  latencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  latencyChipText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '600',
  },
  multiLlmSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.15)',
    paddingTop: 8,
  },
  expandToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  expandToggleText: {
    color: COLORS.accentLight,
    fontSize: 12,
    fontWeight: '600',
  },
  multiLlmDetails: {
    marginTop: 10,
    gap: 12,
  },
  // Inline Consensus
  inlineConsensus: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: ROUNDING.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  inlineConsensusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inlineConsensusLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  inlineConsensusScore: {
    fontSize: 14,
    fontWeight: '800',
  },
  inlineScoreBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  inlineScoreBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Inline Sections
  inlineSectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  inlineModelRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: ROUNDING.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inlineModelRowBest: {
    borderColor: 'rgba(76, 175, 80, 0.3)',
    backgroundColor: 'rgba(76, 175, 80, 0.04)',
  },
  inlineModelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inlineModelIcon: {
    fontSize: 14,
  },
  inlineModelName: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineBestBadge: {
    color: COLORS.healthy,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 'auto',
    backgroundColor: 'rgba(102, 187, 106, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: ROUNDING.full,
  },
  inlineModelAnswer: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  // Inline Judgment
  inlineJudgment: {
    backgroundColor: 'rgba(255, 143, 0, 0.04)',
    borderColor: 'rgba(255, 143, 0, 0.15)',
    borderWidth: 1,
    borderRadius: ROUNDING.sm,
    padding: 10,
  },
  inlineJudgmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inlineJudgmentTitle: {
    color: COLORS.accentLight,
    fontSize: 12,
    fontWeight: '700',
  },
  inlineJudgmentText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
});
