import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { processQuery, SUGGESTED_QUERIES, type AssistantResponse } from '../../lib/assistant';
import { getAllPeptides, type Peptide } from '../../lib/database';
import AssistantMessage from '../../components/AssistantMessage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  response?: AssistantResponse;
}

export default function AssistantScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [peptides, setPeptides] = useState<Peptide[]>([]);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getAllPeptides().then(setPeptides);
  }, []);

  const handleSend = useCallback((text: string) => {
    const q = text.trim();
    if (!q || peptides.length === 0) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: q };
    const response = processQuery(q, peptides);
    const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', response };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [peptides]);

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.text}</Text>
        </View>
      );
    }
    if (item.response) {
      return <AssistantMessage response={item.response} />;
    }
    return null;
  }, [styles]);

  const showWelcome = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={showWelcome ? (
          <View style={styles.welcome}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="sparkles" size={32} color={colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Peptide Assistant</Text>
            <Text style={styles.welcomeSubtitle}>
              Ask about dosing, side effects, cycling, interactions, or compare peptides.
            </Text>
            <View style={styles.chips}>
              {SUGGESTED_QUERIES.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.chip}
                  onPress={() => handleSend(q)}
                >
                  <Text style={styles.chipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask about a peptide..."
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
          onPress={() => handleSend(input)}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: Spacing.lg, paddingBottom: Spacing.sm },
    welcome: { alignItems: 'center', paddingVertical: Spacing.lg * 2 },
    welcomeIcon: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: colors.primaryLight,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    welcomeTitle: { fontSize: FontSize.title, fontWeight: '800', color: colors.text, marginBottom: Spacing.sm },
    welcomeSubtitle: { fontSize: FontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.lg },
    chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
    chip: {
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.full,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    chipText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' },
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.lg,
      borderBottomRightRadius: 4,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      maxWidth: '80%',
    },
    userText: { color: '#ffffff', fontSize: FontSize.md },
    inputRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      padding: Spacing.md, paddingBottom: Spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1, backgroundColor: colors.input,
      borderRadius: BorderRadius.lg, padding: Spacing.md,
      fontSize: FontSize.md, color: colors.text,
      borderWidth: 1, borderColor: colors.inputBorder,
    },
    sendBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}
