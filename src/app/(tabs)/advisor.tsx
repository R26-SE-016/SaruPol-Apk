import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import { sendAdvisoryMessage } from '../../services/advisoryService';
import { useAppStore } from '../../store/appStore';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  sources?: string[];
  timestamp: string;
}

export default function AdvisorScreen() {
  const { t } = useTranslation();
  const language = useAppStore(state => state.language);

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
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    
    // Auto Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await sendAdvisoryMessage(trimmed);
      
      const botMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: response.answer,
        sources: response.sources || [],
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('advisor.title')}</Text>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
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
    paddingHorizontal: 24,
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
    textAlign: 'center',
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
});
