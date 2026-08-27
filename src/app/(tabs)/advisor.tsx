import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import GlassCard from '../../components/common/GlassCard';
import ImageCard, { ImageReference } from '../../components/ImageCard';
import VoiceInputButton from '../../components/VoiceInputButton';
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
  // Reliability metrics
  retrieval_confidence?: number;
  combined_reliability?: number;
  reliability_level?: string;
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

export interface ChatSession {
  id: string;
  topic: string;
  timestamp: number;
  messages: Message[];
  chatMode: 'standard' | 'multi';
}

const getLocName = (name: string, lang: string) => {
  if (lang === 'si') {
    if (name.includes('Wet Zone')) return 'තෙත් කලාපය';
    if (name.includes('Intermediate Zone')) return 'අතරමැදි කලාපය';
    if (name.includes('Dry Zone')) return 'වියළි කලාපය';
    if (name.includes('Auto')) return 'ස්වයංක්‍රීය (GPS)';
  } else if (lang === 'ta') {
    if (name.includes('Wet Zone')) return 'ஈர மண்டலம்';
    if (name.includes('Intermediate Zone')) return 'இடைநிலை மண்டலம்';
    if (name.includes('Dry Zone')) return 'உலர் மண்டலம்';
    if (name.includes('Auto')) return 'தானியங்கி (GPS)';
  }
  return name;
};

const getSeasonName = (name: string, lang: string) => {
  if (lang === 'si') {
    if (name.includes('Yala')) return 'යල කන්නය';
    if (name.includes('Maha')) return 'මහ කන්නය';
    if (name.includes('Auto')) return 'ස්වයංක්‍රීය (දිනය)';
  } else if (lang === 'ta') {
    if (name.includes('Yala')) return 'யால பருவம்';
    if (name.includes('Maha')) return 'மகா பருவம்';
    if (name.includes('Auto')) return 'தானியங்கி (தேதி)';
  }
  return name;
};

const getTranslatedContext = (ctx: string, lang: string) => {
  if (!ctx) return '';
  if (lang === 'en') return ctx;
  let translated = ctx;
  if (lang === 'si') {
    translated = translated.replace('Wet Zone', 'තෙත් කලාපය').replace('Intermediate Zone', 'අතරමැදි කලාපය')
      .replace('Dry Zone', 'වියළි කලාපය').replace('Unknown Zone', 'නොදන්නා කලාපය')
      .replace('Yala Season', 'යල කන්නය').replace('Maha Season', 'මහ කන්නය')
      .replace('Demo Mode', 'ආදර්ශන ප්‍රකාරය')
      .replace('January', 'ජනවාරි').replace('February', 'පෙබරවාරි').replace('March', 'මාර්තු')
      .replace('April', 'අප්‍රේල්').replace('May', 'මැයි').replace('June', 'ජූනි')
      .replace('July', 'ජූලි').replace('August', 'අගෝස්තු').replace('September', 'සැප්තැම්බර්')
      .replace('October', 'ඔක්තෝබර්').replace('November', 'නොවැම්බර්').replace('December', 'දෙසැම්බර්');
  } else if (lang === 'ta') {
    translated = translated.replace('Wet Zone', 'ஈர மண்டலம்').replace('Intermediate Zone', 'இடைநிலை மண்டலம்')
      .replace('Dry Zone', 'உலர் மண்டலம்').replace('Unknown Zone', 'அறியப்படாத மண்டலம்')
      .replace('Yala Season', 'யால பருவம்').replace('Maha Season', 'மகா பருவம்')
      .replace('Demo Mode', 'டெமோ முறை')
      .replace('January', 'ஜனவரி').replace('February', 'பிப்ரவரி').replace('March', 'மார்ச்')
      .replace('April', 'ஏப்ரல்').replace('May', 'மே').replace('June', 'ஜூன்')
      .replace('July', 'ஜூலை').replace('August', 'ஆகஸ்ட்').replace('September', 'செப்டம்பர்')
      .replace('October', 'அக்டோபர்').replace('November', 'நவம்பர்').replace('December', 'டிசம்பர்');
  }
  return translated;
};

const ReliabilityBadge = ({
  combinedReliability,
  reliabilityLevel,
  retrievalConfidence,
  language
}: {
  combinedReliability?: number;
  reliabilityLevel?: string;
  retrievalConfidence?: number;
  language: string;
}) => {
  if (combinedReliability === undefined && retrievalConfidence === undefined) {
    return null;
  }

  const score = combinedReliability !== undefined
    ? Math.round(combinedReliability)
    : Math.round((retrievalConfidence || 0.85) * 100);
  const level = reliabilityLevel || (score >= 80 ? 'High' : score >= 60 ? 'Moderate' : 'Low');

  let badgeBg = 'rgba(102, 187, 106, 0.14)';
  let badgeBorder = 'rgba(102, 187, 106, 0.35)';
  let badgeColor = '#66BB6A';
  let iconName: any = 'shield-checkmark';
  let levelText = language === 'ta' ? 'அதிக நம்பகத்தன்மை' : language === 'si' ? 'ඉහළ විශ්වසනීයත්වය' : 'High Reliability';

  if (level === 'Low' || score < 60) {
    badgeBg = 'rgba(239, 83, 80, 0.16)';
    badgeBorder = 'rgba(239, 83, 80, 0.4)';
    badgeColor = '#EF5350';
    iconName = 'alert-circle';
    levelText = language === 'ta' ? 'குறைந்த நம்பகத்தன்மை' : language === 'si' ? 'අඩු විශ්වසනීයත්වය' : 'Low Reliability';
  } else if (level === 'Moderate' || score < 80) {
    badgeBg = 'rgba(255, 202, 40, 0.14)';
    badgeBorder = 'rgba(255, 202, 40, 0.35)';
    badgeColor = '#FFCA28';
    iconName = 'warning-outline';
    levelText = language === 'ta' ? 'நடுத்தர நம்பகத்தன்மை' : language === 'si' ? 'මධ්‍යම විශ්වසනීයත්වය' : 'Moderate Reliability';
  }

  return (
    <View style={[styles.reliabilityBadgeContainer, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
      <View style={styles.reliabilityBadgeHeader}>
        <Ionicons name={iconName} size={14} color={badgeColor} style={{ marginRight: 5 }} />
        <Text style={[styles.reliabilityBadgeScore, { color: badgeColor }]}>{score}%</Text>
        <Text style={[styles.reliabilityBadgeLevel, { color: badgeColor }]}>• {levelText}</Text>
      </View>
      {(level === 'Low' || score < 60) && (
        <View style={styles.lowReliabilityAlert}>
          <Text style={styles.lowReliabilityAlertText}>
            {language === 'ta'
              ? '⚠️ கவனத்திற்கு: குறைந்த நம்பகத்தன்மை — விவசாய போதனாசிரியரை (Agricultural Officer) அணுகி சரிபார்க்கவும்.'
              : language === 'si'
              ? '⚠️ අවධානයට: අඩු විශ්වසනීයත්වයක් වාර්තා වේ — කරුණාකර ප්‍රාදේශීය කෘෂිකර්ම නිලධාරීවරයෙකුගෙන් විමසන්න.'
              : '⚠️ Caution: Low reliability — Please consult your local agricultural officer for verification.'}
          </Text>
        </View>
      )}
    </View>
  );
};

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

  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);


  const handleEditQuestion = (msg: Message) => {
    setEditingMsgId(msg.id);
    setInputText(msg.text);
    setTimeout(() => textInputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingMsgId(null);
    setInputText('');
  };

  const handleLanguageChange = async (targetLang: 'en' | 'si' | 'ta') => {
    if (targetLang === language || translating) return;
    const currentLang = language;
    const nextLang = targetLang;
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

      if (msg.images && msg.images.length > 0) {
        msg.images.forEach((img, idx) => {
          if (!msg.translations?.[`img_${idx}_${nextLang}`] && img.caption) {
            messagesToTranslate.push({ id: msg.id + `_img_${idx}`, text: img.caption });
          }
        });
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

        if (msg.images && msg.images.length > 0) {
          updatedMsg.images = msg.images.map((img, idx) => ({
            ...img,
            caption: msg.translations?.[`img_${idx}_${nextLang}`] || img.caption
          }));
        }

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
          if (msg.images && msg.images.length > 0) {
            msg.images.forEach((img, idx) => {
              if (!cachedTranslations[`img_${idx}_${currentLang}`] && img.caption) {
                cachedTranslations[`img_${idx}_${currentLang}`] = img.caption;
              }
            });
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

          if (msg.images && msg.images.length > 0) {
            msg.images.forEach((img, idx) => {
              const imgTrans = result.translations.find((t: any) => t.id === msg.id + `_img_${idx}`);
              if (imgTrans) {
                cachedTranslations[`img_${idx}_${nextLang}`] = imgTrans.translated_text;
              }
            });
          }

          let updatedImages = msg.images;
          if (msg.images && msg.images.length > 0) {
            updatedImages = msg.images.map((img, idx) => ({
              ...img,
              caption: cachedTranslations[`img_${idx}_${nextLang}`] || img.caption
            }));
          }

          let updatedMsg = {
            ...msg,
            text: cachedTranslations[nextLang] || msg.text,
            translations: cachedTranslations,
            images: updatedImages
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

        if (msg.images && msg.images.length > 0) {
          updatedMsg.images = msg.images.map((img, idx) => ({
            ...img,
            caption: msg.translations?.[`img_${idx}_${nextLang}`] || img.caption
          }));
        }

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
      text: language === 'ta'
        ? "வணக்கம்! நான் SaruPol AI விவசாய ஆலோசகர். தேங்காய் பயிர்ச்செய்கை, பூச்சி கட்டுப்பாடு, நோய்கள் அல்லது உர திட்டங்கள் பற்றி எந்தக் கேள்வியையும் கேளுங்கள்!"
        : language === 'si'
        ? "ආයුබෝවන්! මම සරුපොල් AI වගා උපදේශකයා වෙමි. පොල් වගාව, පළිබෝධ පාලනය, රෝග හෝ පොහොර යෙදීම් පිළිබඳ ඕනෑම ගැටලුවක් මගෙන් විමසන්න."
        : "Hello! I am your SaruPol AI Farming Advisor. I can answer any questions about coconut cultivation, pest controls, diseases, or fertilizer schedules. Ask me anything!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Keep welcome message translated dynamically when language switches
  React.useEffect(() => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === 'welcome') {
        return {
          ...msg,
          text: language === 'ta'
            ? "வணக்கம்! நான் SaruPol AI விவசாய ஆலோசகர். தேங்காய் பயிர்ச்செய்கை, பூச்சி கட்டுப்பாடு, நோய்கள் அல்லது உர திட்டங்கள் பற்றி எந்தக் கேள்வியையும் கேளுங்கள்!"
            : language === 'si'
            ? "ආයුබෝවන්! මම සරුපොල් AI වගා උපදේශකයා වෙමි. පොල් වගාව, පළිබෝධ පාලනය, රෝග හෝ පොහොර යෙදීම් පිළිබඳ ඕනෑම ගැටලුවක් මගෙන් විමසන්න."
            : "Hello! I am your SaruPol AI Farming Advisor. I can answer any questions about coconut cultivation, pest controls, diseases, or fertilizer schedules. Ask me anything!"
        };
      }
      return msg;
    }));
  }, [language]);
  const [inputText, setInputText] = useState('');
  const [isTranscribedFromVoice, setIsTranscribedFromVoice] = useState(false);
  const [highlightTranscribedText, setHighlightTranscribedText] = useState(false);

  const handleTranscriptionComplete = (transcribedText: string) => {
    if (!transcribedText.trim()) return;

    setInputText(transcribedText);
    setIsTranscribedFromVoice(true);
    setHighlightTranscribedText(true);

    setTimeout(() => {
      textInputRef.current?.focus();
    }, 50);

    setTimeout(() => {
      setHighlightTranscribedText(false);
    }, 2000);
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (isTranscribedFromVoice) {
      setIsTranscribedFromVoice(false);
    }
  };

  const [chatMode, setChatMode] = useState<'standard' | 'multi'>('standard');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [expandedMultiLlmMsgIds, setExpandedMultiLlmMsgIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState<string | null>(null);
  const [zoneOverride, setZoneOverride] = useState<'auto' | 'Wet Zone' | 'Intermediate Zone' | 'Dry Zone'>('auto');
  const [seasonOverride, setSeasonOverride] = useState<'auto' | 'Yala' | 'Maha'>('auto');
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load chat history on mount
  React.useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem('sarupol_chat_history');
        if (stored) {
          setChatHistory(JSON.parse(stored));
        }
      } catch (err) {
        console.warn("Failed to load chat history:", err);
      }
    };
    loadHistory();
  }, []);

  // Save current chat session whenever messages change
  React.useEffect(() => {
    if (messages.length <= 1) return; // Don't save empty/welcome-only sessions
    
    const saveChat = async () => {
      try {
        setChatHistory(prev => {
          const existingIdx = prev.findIndex(s => s.id === sessionId);
          const topicMsg = messages.find(m => m.sender === 'user');
          const topic = topicMsg ? topicMsg.text.substring(0, 30) + (topicMsg.text.length > 30 ? '...' : '') : 'New Chat';
          
          const newSession: ChatSession = {
            id: sessionId,
            topic,
            timestamp: Date.now(),
            messages,
            chatMode
          };

          let updated;
          if (existingIdx >= 0) {
            updated = [...prev];
            updated[existingIdx] = newSession;
          } else {
            updated = [newSession, ...prev];
          }
          
          AsyncStorage.setItem('sarupol_chat_history', JSON.stringify(updated)).catch(console.warn);
          return updated;
        });
      } catch (err) {
        console.warn("Failed to save chat:", err);
      }
    };
    saveChat();
  }, [messages, sessionId, chatMode]);

  const handleStartNewChat = () => {
    setSessionId(generateUUID());
    setMessages([{
      id: 'welcome',
      sender: 'bot',
      text: language === 'ta'
        ? "வணக்கம்! நான் SaruPol AI விவசாய ஆலோசகர். தேங்காய் பயிர்ச்செய்கை, பூச்சி கட்டுப்பாடு, நோய்கள் அல்லது உர திட்டங்கள் பற்றி எந்தக் கேள்வியையும் கேளுங்கள்!"
        : language === 'si'
        ? "ආයුබෝවන්! මම සරුපොල් AI වගා උපදේශකයා වෙමි. පොල් වගාව, පළිබෝධ පාලනය, රෝග හෝ පොහොර යෙදීම් පිළිබඳ ඕනෑම ගැටලුවක් මගෙන් විමසන්න."
        : "Hello! I am your SaruPol AI Farming Advisor. I can answer any questions about coconut cultivation, pest controls, diseases, or fertilizer schedules. Ask me anything!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setShowDemoPanel(false);
  };

  const handleLoadSession = (session: ChatSession) => {
    setSessionId(session.id);
    setMessages(session.messages);
    setChatMode(session.chatMode || 'standard');
    setShowDemoPanel(false);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const updated = chatHistory.filter(s => s.id !== id);
      setChatHistory(updated);
      await AsyncStorage.setItem('sarupol_chat_history', JSON.stringify(updated));
      
      // If the deleted session is the currently active one, start a new chat
      if (id === sessionId) {
        handleStartNewChat();
      }
    } catch (err) {
      console.warn("Failed to delete chat session:", err);
    }
  };

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
      const url = getTtsUrl(text, language);
      if (__DEV__) console.log("Fetching TTS audio from endpoint:", url.split('?')[0]);

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { 
          shouldPlay: true,
          rate: language === 'si' ? 1.25 : 1.0,
          shouldCorrectPitch: true,
        },
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

  // Pre-initialize audio mode once and clean up on component unmount
  React.useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    }).catch((err) => console.warn("Failed to configure audio session:", err));

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
    language === 'ta' ? "இளம் தேங்காய் மரங்களுக்கு உரமிட வேண்டியது எப்படி?" : language === 'si' ? "පොල් පැළ සඳහා පොහොර යෙදිය යුත්තේ කෙසේද?" : "How should I fertilize young coconut palms?",
    language === 'ta' ? "நல்ல தாய் பனையை தேர்ந்தெடுப்பது எப்படி?" : language === 'si' ? "හොඳ මව් ශාකයක් තෝරා ගන්නේ කෙසේද?" : "How do I select a good mother palm?",
    language === 'ta' ? "தேங்காய் நாற்றங்காலில் கறையானைகளை கட்டுப்படுத்துவது எப்படி?" : language === 'si' ? "පොල් තවාන් වල වේයන් පාලනය කරන්නේ කෙසේද?" : "How do I control termites in coconut nursery?",
    language === 'ta' ? "தேங்காய் நாற்றுகளுக்கு பரிந்துரைக்கப்படும் உரக் கலவை என்ன?" : language === 'si' ? "පොල් පැළ සඳහා නිර්දේශිත පොහොර මිශ්‍රණය කුමක්ද?" : "What fertilizer mixture is recommended for coconut seedlings?"
  ];

  const handleSend = async (textToSend: string) => {
    setIsTranscribedFromVoice(false);
    setHighlightTranscribedText(false);

    const trimmed = textToSend.trim();
    if (!trimmed) return;

    let sendLat = userCoords?.lat;
    let sendLon = userCoords?.lon;
    if (zoneOverride === 'Wet Zone') {
      sendLat = 6.9271; sendLon = 79.8612;
    } else if (zoneOverride === 'Intermediate Zone') {
      sendLat = 7.2906; sendLon = 80.6337;
    } else if (zoneOverride === 'Dry Zone') {
      sendLat = 8.3114; sendLon = 80.4037;
    }

    let sendContext = userContext;
    if (zoneOverride !== 'auto' || seasonOverride !== 'auto') {
      const z = zoneOverride === 'auto' ? (userContext?.split(' | ')[0] || 'Unknown Zone') : zoneOverride;
      const s = seasonOverride === 'auto' ? (userContext?.split(' | ')[1]?.split(' ')[0] || 'Unknown') : seasonOverride;
      const m = seasonOverride === 'auto' ? (userContext?.split('(')[1]?.replace(')', '') || '') : (seasonOverride === 'Yala' ? 'July' : 'December');
      sendContext = `${z} | ${s} Season (${m})`;
    }

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
    const isTamilInput = /[\u0B80-\u0BFF]/.test(trimmed);
    const detectedLang = isSinhalaInput ? 'si' : isTamilInput ? 'ta' : 'en';

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
        const response = await sendMultiLLMQuery(trimmed, sendLat, sendLon, language, sessionId, sendContext);
        if (response.session_id) {
          setSessionId(response.session_id);
        }
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
            retrieval_confidence: response.retrieval_confidence ?? 0.85,
            combined_reliability: response.combined_reliability ?? 80,
            reliability_level: response.reliability_level ?? 'Moderate',
          };
          setMessages(prev => [...prev, botMsg]);
        }
      } else {
        const response = await sendAdvisoryMessage(
          trimmed,
          sendContext,
          language,
          sessionId,
          sendLat,
          sendLon
        );

        if (response.session_id) {
          setSessionId(response.session_id);
        }

        // If backend returned translated question in Sinhala, update user question message
        if (response.question && language !== 'en' && detectedLang === 'en') {
          setMessages(prev => prev.map(m => m.id === userMsg.id ? {
            ...m,
            text: response.question,
            translations: { ...m.translations, [language]: response.question }
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
          retrieval_confidence: response.retrieval_confidence ?? 0.85,
          combined_reliability: response.combined_reliability ?? 80,
          reliability_level: response.reliability_level ?? 'Moderate',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: language === 'ta'
          ? "மன்னிக்கவும், தகவல் தளத்துடன் இணைப்பதில் சிக்கல் ஏற்பட்டுள்ளது. உங்கள் இணைய இணைப்பை சரிபார்க்கவும்."
          : language === 'si'
          ? "සමාවන්න, උපදේශන සේවාව සමඟ සම්බන්ධ වීමට අපොහොසත් විය. කරුණාකර අන්තර්ජාලය පරීක්ෂා කරන්න."
          : "Sorry, I am facing connectivity issues to my knowledge base. Please check your internet connection.",
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
        text: language === 'ta'
          ? "வணக்கம்! நான் SaruPol AI விவசாய ஆலோசகர். தேங்காய் பயிர்ச்செய்கை, பூச்சி கட்டுப்பாடு, நோய்கள் அல்லது உர திட்டங்கள் பற்றி எந்தக் கேள்வியையும் கேளுங்கள்!"
          : language === 'si'
          ? "ආයුබෝවන්! මම සරුපොල් AI වගා උපදේශකයා වෙමි. පොල් වගාව, පළිබෝධ පාලනය, රෝග හෝ පොහොර යෙදීම් පිළිබඳ ඕනෑම ගැටලුවක් මගෙන් විමසන්න."
          : "Hello! I am your SaruPol AI Farming Advisor. I can answer any questions about coconut cultivation, pest controls, diseases, or fertilizer schedules. Ask me anything!",
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
          <TouchableOpacity onPress={handleStartNewChat} style={styles.iconOnlyDeleteButton} activeOpacity={0.7}>
            <Ionicons name="add" size={24} color={COLORS.primaryLight} />
          </TouchableOpacity>
          <View style={styles.langSelectorRow}>
            {(['en', 'si', 'ta'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.langToggle,
                  language === lang && styles.langToggleActive
                ]}
                onPress={() => handleLanguageChange(lang)}
                disabled={translating}
              >
                <Text style={[
                  styles.langToggleText,
                  language === lang && styles.langToggleTextActive
                ]}>
                  {lang === 'en' ? 'EN' : lang === 'si' ? 'සිං' : 'த'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => setShowDemoPanel(true)} style={[styles.iconOnlyDeleteButton, { marginLeft: 8 }]} activeOpacity={0.7}>
            <Ionicons name="menu-outline" size={28} color={COLORS.textPrimary} />
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
            {language === 'ta' ? 'AI அரட்டை' : language === 'si' ? 'AI සංවාදය' : 'AI Chat'}
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

      {/* Demo Sidebar Modal */}
      <Modal visible={showDemoPanel} animationType="fade" transparent={true} onRequestClose={() => setShowDemoPanel(false)}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setShowDemoPanel(false)} activeOpacity={1} />
          <View style={{ width: 320, backgroundColor: COLORS.surface, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderTopLeftRadius: 30, borderBottomLeftRadius: 30, shadowColor: '#000', shadowOffset: { width: -10, height: 0 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 20 }}>
            {/* Header / Close Button Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 }}>
              <TouchableOpacity onPress={handleStartNewChat} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 }}>
                <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                  {language === 'ta' ? 'புதிய அரட்டை' : language === 'si' ? 'නව සංවාදය' : 'New Chat'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDemoPanel(false)} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 20 }}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 24 }}>
              {/* Zone Section */}
              <View style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="location-outline" size={16} color={COLORS.primaryLight} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>
                    {language === 'ta' ? 'மண்டலம்' : language === 'si' ? 'ස්ථාන කලාපය' : 'Location Zone'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'column', gap: 2 }}>
                  {[
                    { id: 'auto', label: 'Auto (GPS)' },
                    { id: 'Wet Zone', label: 'Wet Zone' },
                    { id: 'Intermediate Zone', label: 'Intermediate Zone' },
                    { id: 'Dry Zone', label: 'Dry Zone' }
                  ].map(item => (
                    <TouchableOpacity key={item.id} onPress={() => setZoneOverride(item.id as any)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: zoneOverride === item.id ? COLORS.glassBackground : 'rgba(255,255,255,0.03)', borderRadius: 10, borderWidth: 1, borderColor: zoneOverride === item.id ? COLORS.primaryLight : 'transparent' }} activeOpacity={0.7}>
                      <Text style={{ color: zoneOverride === item.id ? COLORS.textPrimary : COLORS.textSecondary, fontSize: 13, fontWeight: zoneOverride === item.id ? '600' : '500' }}>{getLocName(item.label, language)}</Text>
                      {zoneOverride === item.id && <Ionicons name="checkmark-circle" size={16} color={COLORS.primaryLight} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Season Section */}
              <View style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="leaf-outline" size={16} color={COLORS.primaryLight} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>
                    {language === 'ta' ? 'தற்போதைய பருவம்' : language === 'si' ? 'වත්මන් කන්නය' : 'Current Season'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'column', gap: 2 }}>
                  {[
                    { id: 'auto', label: 'Auto (Date)' },
                    { id: 'Yala', label: 'Yala Season' },
                    { id: 'Maha', label: 'Maha Season' }
                  ].map(item => (
                    <TouchableOpacity key={item.id} onPress={() => setSeasonOverride(item.id as any)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: seasonOverride === item.id ? COLORS.glassBackground : 'rgba(255,255,255,0.03)', borderRadius: 10, borderWidth: 1, borderColor: seasonOverride === item.id ? COLORS.primaryLight : 'transparent' }} activeOpacity={0.7}>
                      <Text style={{ color: seasonOverride === item.id ? COLORS.textPrimary : COLORS.textSecondary, fontSize: 13, fontWeight: seasonOverride === item.id ? '600' : '500' }}>{getSeasonName(item.label, language)}</Text>
                      {seasonOverride === item.id && <Ionicons name="checkmark-circle" size={16} color={COLORS.primaryLight} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10, marginHorizontal: 24 }} />

            <ScrollView style={{ paddingHorizontal: 24, flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Chat History Section */}
              <View style={{ paddingBottom: 40 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <Ionicons name="time-outline" size={18} color={COLORS.primaryLight} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>
                    {language === 'ta' ? 'அரட்டை வரலாறு' : language === 'si' ? 'සංවාද ඉතිහාසය' : 'Chat History'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'column', gap: 10 }}>
                  {chatHistory.length === 0 ? (
                    <Text style={{ color: COLORS.textMuted, fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }}>
                      {language === 'ta' ? 'இதுவரை வரலாறு இல்லை.' : language === 'si' ? 'තවම ඉතිහාසයක් නොමැත.' : 'No history yet.'}
                    </Text>
                  ) : (
                    chatHistory.map(session => (
                      <View key={session.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: sessionId === session.id ? COLORS.glassBackground : 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: sessionId === session.id ? COLORS.primaryLight : 'transparent' }}>
                        <TouchableOpacity style={{ flex: 1, marginRight: 10 }} onPress={() => handleLoadSession(session)}>
                          <Text style={{ color: sessionId === session.id ? COLORS.textPrimary : COLORS.textSecondary, fontSize: 14, fontWeight: sessionId === session.id ? '600' : '500' }} numberOfLines={1}>{session.topic}</Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 4 }}>
                            {new Date(session.timestamp).toLocaleDateString()} • {session.chatMode === 'multi' ? 'Multi-LLM' : 'AI Chat'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteSession(session.id)} style={{ padding: 6 }}>
                          <Ionicons name="trash-outline" size={18} color="#EF5350" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Context Banner */}
      {userContext && (
        <View style={[styles.contextBanner, (zoneOverride !== 'auto' || seasonOverride !== 'auto') && { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
          <Ionicons name="location" size={14} color={(zoneOverride !== 'auto' || seasonOverride !== 'auto') ? '#F59E0B' : COLORS.primaryLight} />
          <Text style={[styles.contextBannerText, (zoneOverride !== 'auto' || seasonOverride !== 'auto') && { color: '#B45309' }]}>
            {getTranslatedContext((zoneOverride !== 'auto' || seasonOverride !== 'auto') ? `${zoneOverride === 'auto' ? (userContext?.split(' | ')[0] || '') : zoneOverride} | ${seasonOverride === 'auto' ? (userContext?.split(' | ')[1]?.split(' ')[0] || '') : seasonOverride} (Demo Mode)` : userContext, language)}
          </Text>
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
                      {language === 'ta' ? 'நீங்கள்' : language === 'si' ? 'ඔබ' : 'You'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleEditQuestion(msg)}
                      style={styles.userEditButton}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="create-outline" size={12} color="#FFFFFF" />
                      <Text style={styles.userEditText}>
                        {language === 'ta' ? 'திருத்து' : language === 'si' ? 'සංස්කරණය' : 'Edit'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.userText}>{msg.text}</Text>
                  <Text style={styles.userTime}>{msg.timestamp}</Text>
                </View>
              </View>
            ) : (
              <GlassCard style={[styles.botBubble, msg.isMultiLlm && styles.botBubbleMultiLlm]}>
                {/* Bot Header with Sender & Listen/Audio Button */}
                <View style={styles.botBubbleHeader}>
                  <View style={styles.botSenderRow}>
                    <Ionicons name="sparkles" size={12} color={COLORS.primaryLight} />
                    <Text style={styles.botSenderLabel}>
                      {language === 'ta' ? 'சருபோல் AI' : language === 'si' ? 'සරුපොල් AI' : 'SaruPol AI'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => toggleAudio(msg.id, msg.text)}
                    style={[
                      styles.audioButton,
                      activeAudioMsgId === msg.id && styles.audioButtonActive
                    ]}
                    disabled={audioLoadingMsgId === msg.id}
                    activeOpacity={0.75}
                  >
                    {audioLoadingMsgId === msg.id ? (
                      <ActivityIndicator size="small" color={COLORS.primaryLight} style={{ marginRight: 4, transform: [{ scale: 0.8 }] }} />
                    ) : (
                      <Ionicons
                        name={activeAudioMsgId === msg.id ? "volume-mute-outline" : "volume-medium-outline"}
                        size={14}
                        color={activeAudioMsgId === msg.id ? COLORS.primaryLight : COLORS.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text style={[
                      styles.audioButtonText,
                      activeAudioMsgId === msg.id ? styles.audioActiveText : styles.audioInactiveText
                    ]}>
                      {activeAudioMsgId === msg.id
                        ? (language === 'ta' ? 'நிறுத்து' : language === 'si' ? 'නවතන්න' : 'Stop')
                        : (language === 'ta' ? 'கேட்க' : language === 'si' ? 'සවන් දෙන්න' : 'Listen')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {msg.isMultiLlm && (
                  <View style={styles.earlyExitBadgeRow}>
                    {msg.early_exit ? (
                      <View style={styles.earlyExitBadge}>
                        <Ionicons name="flash" size={12} color="#66BB6A" />
                        <Text style={styles.earlyExitBadgeText}>
                          {language === 'ta' ? 'விரைவு சரிபார்ப்பு' : language === 'si' ? 'ඉක්මන් සත්‍යාපනය' : 'Fast Validated'}
                        </Text>
                        {msg.similarity_score != null && (
                          <View style={styles.similarityChip}>
                            <Text style={styles.similarityChipText}>
                              {Math.round(msg.similarity_score * 100)}% {language === 'ta' ? 'பொருத்தம்' : language === 'si' ? 'ගැලපීම' : 'match'}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.bestAnswerBadge}>
                        <Ionicons name="shield-checkmark" size={12} color={COLORS.healthy} />
                        <Text style={styles.bestAnswerBadgeText}>
                          {language === 'ta' ? 'சிறந்த பதில் தேர்ந்தெடுக்கப்பட்டது' : language === 'si' ? 'තෝරාගත් හොඳම පිළිතුර' : 'Best Answer Selected'}
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

                {/* Reliability Badge (Shown for all bot responses in /ask and /ask-multi) */}
                <ReliabilityBadge
                  combinedReliability={msg.combined_reliability}
                  reliabilityLevel={msg.reliability_level}
                  retrievalConfidence={msg.retrieval_confidence}
                  language={language}
                />

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
                          ? (language === 'ta' ? 'ஒப்பீட்டு விவரங்களை மறை' : language === 'si' ? 'සංසන්දනාත්මක විස්තර සඟවන්න' : 'Hide Comparison Details')
                          : (language === 'ta' ? '3 மாதிரி பதில்கள் & தீர்ப்பைப் பார்' : language === 'si' ? 'ආකෘති 3හි පිළිතුරු සහ විනිශ්චය බලන්න' : 'View 3 Model Answers & Judgment')}
                      </Text>
                    </TouchableOpacity>

                    {expandedMultiLlmMsgIds[msg.id] && (
                      <View style={styles.multiLlmDetails}>
                        {/* Combined Reliability Summary Card (Part 4) */}
                        <View style={styles.multiLlmReliabilityCard}>
                          <View style={styles.multiLlmReliabilityHeader}>
                            <View style={styles.multiLlmReliabilityTitleRow}>
                              <Ionicons name="analytics-outline" size={15} color={COLORS.accentLight} style={{ marginRight: 6 }} />
                              <Text style={styles.multiLlmReliabilityTitle}>
                                {language === 'ta' ? 'ஒருங்கிணைந்த நம்பகத்தன்மை' : language === 'si' ? 'ඒකාබද්ධ විශ්වසනීයත්වය' : 'Combined Reliability'}
                              </Text>
                            </View>
                            <View style={[
                              styles.multiLlmScoreBadge,
                              {
                                backgroundColor: (msg.combined_reliability ?? 80) >= 80
                                  ? 'rgba(102, 187, 106, 0.18)'
                                  : (msg.combined_reliability ?? 80) >= 60
                                  ? 'rgba(255, 202, 40, 0.18)'
                                  : 'rgba(239, 83, 80, 0.18)',
                                borderColor: (msg.combined_reliability ?? 80) >= 80
                                  ? '#66BB6A'
                                  : (msg.combined_reliability ?? 80) >= 60
                                  ? '#FFCA28'
                                  : '#EF5350',
                              }
                            ]}>
                              <Text style={[
                                styles.multiLlmReliabilityScoreValue,
                                { color: (msg.combined_reliability ?? 80) >= 80 ? COLORS.healthy : (msg.combined_reliability ?? 80) >= 60 ? COLORS.warning : COLORS.diseased }
                              ]}>
                                {Math.round(msg.combined_reliability ?? 80)}% ({(msg.combined_reliability ?? 80) >= 80 ? (language === 'ta' ? 'அதிகம்' : language === 'si' ? 'ඉහළ' : 'High') : (msg.combined_reliability ?? 80) >= 60 ? (language === 'ta' ? 'நடுத்தரம்' : language === 'si' ? 'මධ්‍යම' : 'Moderate') : (language === 'ta' ? 'குறைவு' : language === 'si' ? 'අඩු' : 'Low')})
                              </Text>
                            </View>
                          </View>

                          <View style={styles.multiLlmReliabilityMetricsRow}>
                            <View style={styles.multiLlmMetricPill}>
                              <Text style={styles.multiLlmMetricLabel}>
                                {language === 'ta' ? 'மீட்புத் தரம் (50%)' : language === 'si' ? 'දත්ත ගැලපීම (50%)' : 'Retrieval (50%)'}
                              </Text>
                              <Text style={styles.multiLlmMetricVal}>
                                {Math.round((msg.retrieval_confidence ?? 0.85) * 100)}%
                              </Text>
                            </View>
                            <View style={styles.multiLlmMetricPill}>
                              <Text style={styles.multiLlmMetricLabel}>
                                {language === 'ta' ? 'மாதிரி ஒருமித்தம் (50%)' : language === 'si' ? 'ආකෘති එකඟතාව (50%)' : 'Consensus (50%)'}
                              </Text>
                              <Text style={styles.multiLlmMetricVal}>
                                {msg.consensus_score ?? 80}%
                              </Text>
                            </View>
                          </View>

                          {((msg.combined_reliability ?? 80) < 60) && (
                            <View style={styles.multiLlmWarningBox}>
                              <Ionicons name="alert-circle" size={16} color={COLORS.diseased} style={{ marginRight: 6 }} />
                              <Text style={styles.multiLlmWarningBoxText}>
                                {language === 'ta'
                                  ? 'குறைந்த நம்பகத்தன்மை கண்டறியப்பட்டது. தயவுசெய்து உங்கள் உள்ளூர் விவசாய அதிகாரியை அணுகி சரிபார்க்கவும்.'
                                  : language === 'si'
                                  ? 'අඩු විශ්වසනීයත්වයක් හඳුනාගෙන ඇත. කරුණාකර තහවුරු කර ගැනීම සඳහා ප්‍රාදේශීය කෘෂිකර්ම නිලධාරීවරයෙකු හමුවන්න.'
                                  : 'Low reliability detected. Please consult your local agricultural officer for verification.'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Consensus Score */}
                        {msg.consensus_score !== undefined && (() => {
                          let consensusColor = COLORS.healthy;
                          let consensusLabel = language === 'ta' ? 'அதிக ஒருமித்தம்' : language === 'si' ? 'ඉහළ එකඟතාව' : 'High Agreement';
                          if (msg.consensus_score < 50) {
                            consensusColor = COLORS.diseased;
                            consensusLabel = language === 'ta' ? 'குறைந்த ஒருமித்தம்' : language === 'si' ? 'අඩු එකඟතාව' : 'Low Agreement';
                          } else if (msg.consensus_score < 80) {
                            consensusColor = COLORS.warning;
                            consensusLabel = language === 'ta' ? 'நடுத்தர ஒருமித்தம்' : language === 'si' ? 'මධ්‍යම එකඟතාව' : 'Moderate Agreement';
                          }
                          return (
                            <View style={styles.inlineConsensus}>
                              <View style={styles.inlineConsensusHeader}>
                                <Text style={styles.inlineConsensusLabel}>
                                  {language === 'ta' ? 'மாதிரி ஒருமித்தம்:' : language === 'si' ? 'ආකෘති එකඟතාව:' : 'Model Consensus:'} <Text style={{ color: consensusColor, fontWeight: '800' }}>{consensusLabel}</Text>
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
                        <Text style={styles.inlineSectionTitle}>{language === 'ta' ? 'தனிநபர் மாதிரி பதில்கள்:' : language === 'si' ? 'ආකෘති මට්ටමින් පිළිතුරු:' : 'Individual Model Answers:'}</Text>

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

                        {/* GPT-4o Mini */}
                        {msg.llama8b_answer && (() => {
                          const isBest = msg.best_model === 'llama8b';
                          return (
                            <View style={[styles.inlineModelRow, isBest && styles.inlineModelRowBest]}>
                              <View style={styles.inlineModelHeader}>
                                <Text style={styles.inlineModelIcon}>💎</Text>
                                <Text style={[styles.inlineModelName, { color: '#00BCD4' }]}>GPT-4o Mini</Text>
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
                              <Text style={styles.inlineJudgmentTitle}>{language === 'ta' ? 'AI நீதிபதி தர்க்கம்:' : language === 'si' ? 'AI විනිසුරු තර්කනය:' : 'AI Judge Reasoning:'}</Text>
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
                      <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} /> {language === 'ta' ? 'பயன்படுத்தப்பட்ட சூழல்:' : language === 'si' ? 'භාවිතා කළ සන්දර්භය:' : 'Context Used:'} {msg.context_used}
                    </Text>
                  </View>
                )}

                {/* Citations / Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <View style={styles.sourcesContainer}>
                    <Text style={styles.sourcesHeader}>
                      📚 {language === 'ta' ? 'CRI சரிபார்க்கப்பட்ட ஆவணங்கள்:' : language === 'si' ? 'CRI සහතික කළ ලේඛන:' : 'CRI Verified Documents:'}
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
                      📷 {language === 'ta' ? 'குறிப்பு படங்கள்:' : language === 'si' ? 'යොමු රූප සටහන්:' : 'Reference Images:'}
                    </Text>
                    {msg.images.map((img, idx) => (
                      <ImageCard key={idx} image={img} />
                    ))}
                  </View>
                )}

                <View style={styles.botBubbleFooter}>
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
                {language === 'ta' ? 'தகவல் தளத்தை தேடுகிறது...' : language === 'si' ? 'විශ්ලේෂණය කරමින් පවතී...' : 'Searching knowledge base...'}
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
                    {language === 'ta' ? 'கேள்வியைத் திருத்துகிறது' : language === 'si' ? 'ප්‍රශ්නය සංස්කරණය කිරීම' : 'Editing Question'}
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
        <View style={[
          styles.inputContainer,
          highlightTranscribedText && styles.inputContainerHighlighted
        ]}>
          <VoiceInputButton
            language={language}
            onTranscriptionComplete={handleTranscriptionComplete}
            disabled={loading}
            size={36}
          />
          <TextInput
            ref={textInputRef}
            style={[styles.textInput, { minHeight: 70, paddingTop: 10, paddingBottom: 10, textAlignVertical: 'top' }]}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder={t('advisor.placeholder')}
            placeholderTextColor={COLORS.textMuted}
            multiline={true}
            numberOfLines={2}
          />
          <TouchableOpacity onPress={() => handleSend(inputText)} style={styles.sendButton} disabled={loading}>
            <Ionicons name={editingMsgId ? "checkmark" : "send"} size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        {isTranscribedFromVoice && (
          <View style={styles.transcribedHintRow}>
            <Ionicons name="mic-outline" size={12} color={COLORS.healthy} />
            <Text style={styles.transcribedHintText}>
              {language === 'si'
                ? 'හඬින් පරිවර්තනය විය — යැවීමට තට්ටු කරන්න හෝ සංස්කරණය කරන්න'
                : language === 'ta'
                ? 'குரலிலிருந்து பெறப்பட்டது — அனுப்ப தட்டவும் அல்லது திருத்தவும்'
                : 'Transcribed from voice — tap send or edit'}
            </Text>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.12)',
    backgroundColor: COLORS.surface,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  iconOnlyDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  langSelectorRow: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    padding: 2,
    borderRadius: ROUNDING.sm,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  langToggle: {
    backgroundColor: 'transparent',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: ROUNDING.sm - 2,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langToggleActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.40)',
    borderColor: COLORS.primaryLight,
    borderWidth: 1,
  },
  langToggleText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  langToggleTextActive: {
    color: '#FFFFFF',
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
  botBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  botSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  botSenderLabel: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  botTime: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  botBubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: ROUNDING.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  audioButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
    borderColor: 'rgba(76, 175, 80, 0.35)',
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
    paddingHorizontal: 8,
    height: 50,
  },
  inputContainerHighlighted: {
    borderColor: COLORS.healthy,
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
    shadowColor: COLORS.healthy,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    height: '100%',
    paddingHorizontal: 10,
  },
  sendButton: {
    backgroundColor: COLORS.primaryLight,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  transcribedHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
  },
  transcribedHintText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
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
  // Reliability Badge Component Styles
  reliabilityBadgeContainer: {
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  reliabilityBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  reliabilityBadgeScore: {
    fontSize: 12,
    fontWeight: '800',
  },
  reliabilityBadgeLevel: {
    fontSize: 11,
    fontWeight: '700',
  },
  lowReliabilityAlert: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 83, 80, 0.25)',
  },
  lowReliabilityAlertText: {
    color: '#EF5350',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  // Multi-LLM Reliability Card Styles (Part 4)
  multiLlmReliabilityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: ROUNDING.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  multiLlmReliabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  multiLlmReliabilityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  multiLlmReliabilityTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  multiLlmScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
  },
  multiLlmReliabilityScoreValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  multiLlmReliabilityMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  multiLlmMetricPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: ROUNDING.sm,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  multiLlmMetricLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginBottom: 2,
  },
  multiLlmMetricVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  multiLlmWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 83, 80, 0.15)',
    borderColor: 'rgba(239, 83, 80, 0.4)',
    borderWidth: 1,
    borderRadius: ROUNDING.sm,
    padding: 8,
    marginTop: 8,
  },
  multiLlmWarningBoxText: {
    color: '#EF5350',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
});
