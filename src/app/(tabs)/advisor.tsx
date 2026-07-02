import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import { sendAdvisoryMessage, translateMessagesBatch } from '../../services/advisoryService';
import { useAppStore } from '../../store/appStore';
import * as Location from 'expo-location';
import { determineSeason, getMonthName, determineZone } from '../../utils/contextHelper';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  translations?: {
    en?: string;
    si?: string;
  };
  sources?: string[];
  context_used?: string;
  timestamp: string;
}

export default function AdvisorScreen() {
  const { t } = useTranslation();
  const language = useAppStore(state => state.language);
  const setLanguage = useAppStore(state => state.setLanguage);

  const [translating, setTranslating] = useState(false);

  const toggleLanguage = async () => {
    const nextLang = language === 'en' ? 'si' : 'en';
    const currentLang = language;
    await setLanguage(nextLang);

    // Find messages that don't have the translation cached
    const messagesToTranslate = messages
      .filter(m => m.id !== 'welcome')
      .filter(m => !m.translations?.[nextLang])
      .map(m => ({ id: m.id, text: m.text }));

    if (messagesToTranslate.length === 0) {
      // All translations cached, just switch text
      setMessages(prev => prev.map(msg => {
        if (msg.id === 'welcome') return msg;
        return {
          ...msg,
          text: msg.translations?.[nextLang] || msg.text
        };
      }));
      return;
    }

    setTranslating(true);
    try {
      const result = await translateMessagesBatch(messagesToTranslate, nextLang);
      if (result.success) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === 'welcome') return msg;
          
          const translation = result.translations.find((t: any) => t.id === msg.id);
          const cachedTranslations = msg.translations || {};
          
          // Cache current text if not saved yet
          if (!cachedTranslations[currentLang]) {
            cachedTranslations[currentLang] = msg.text;
          }
          
          if (translation) {
            cachedTranslations[nextLang] = translation.translated_text;
            return {
              ...msg,
              text: translation.translated_text,
              translations: cachedTranslations
            };
          } else {
            return {
              ...msg,
              text: cachedTranslations[nextLang] || msg.text,
              translations: cachedTranslations
            };
          }
        }));
      }
    } catch (err) {
      console.warn("Failed to translate previous messages:", err);
      // Fallback: load from cache if available
      setMessages(prev => prev.map(msg => {
        if (msg.id === 'welcome') return msg;
        return {
          ...msg,
          text: msg.translations?.[nextLang] || msg.text
        };
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
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      const currentDate = new Date();
      const currentSeason = determineSeason(currentDate);
      const currentMonth = getMonthName(currentDate);

      let currentZone = 'Unknown Zone';
      if (status === 'granted') {
        try {
          let location = await Location.getCurrentPositionAsync({});
          currentZone = determineZone(location.coords.latitude, location.coords.longitude);
        } catch (error) {
          console.log("Error getting location", error);
        }
      }

      const contextString = `${currentZone} | ${currentSeason} Season (${currentMonth})`;
      setUserContext(contextString);
    })();
  }, []);

  // Suggested questions chips
  const suggestions = [
    language === 'en' ? "How to treat Bud Rot disease?" : "කරටි කුණුවීමට ප්‍රතිකාර මොනවාද?",
    language === 'en' ? "What is the NPK fertilizer dosage?" : "adult ගසකට පොහොර ප්‍රමාණය කොපමණද?",
    language === 'en' ? "How to prevent Stem Bleeding?" : "කඳෙන් මැලියම් වැගිරීම පාලනය කරන්නේ කෙසේද?",
    language === 'en' ? "When is the best harvesting cycle?" : "පොල් කැඩීම සඳහා හොඳම කාලය කවදාද?"
  ];

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    // Add User Message
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: trimmed,
      translations: {
        [language]: trimmed
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    
    // Auto Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await sendAdvisoryMessage(trimmed, userContext);
      
      const botMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: response.answer,
        translations: {
          [language]: response.answer
        },
        sources: response.sources ? response.sources.map((s: any) => s.title) : [],
        context_used: response.context_used,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
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
          <TouchableOpacity onPress={startNewChat} style={styles.newChatButton}>
            <Ionicons name="add" size={20} color={COLORS.textSecondary} />
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
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{msg.text}</Text>
                <Text style={styles.userTime}>{msg.timestamp}</Text>
              </View>
            ) : (
              <GlassCard style={styles.botBubble}>
                <Text style={styles.botText}>{msg.text}</Text>
                
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
                
                <Text style={styles.botTime}>{msg.timestamp}</Text>
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
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('advisor.placeholder')}
            placeholderTextColor={COLORS.textMuted}
            onSubmitEditing={() => handleSend(inputText)}
          />
          <TouchableOpacity onPress={() => handleSend(inputText)} style={styles.sendButton}>
            <Ionicons name="send" size={20} color={COLORS.textPrimary} />
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
  userBubble: {
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDING.md,
    borderBottomRightRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: '85%',
  },
  userText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 20,
  },
  userTime: {
    color: COLORS.textSecondary,
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
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
  botTime: {
    color: COLORS.textMuted,
    fontSize: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
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
});
