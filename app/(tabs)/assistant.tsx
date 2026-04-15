import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import AnimatedPressable from '../../components/AnimatedPressable';
import PremiumGate from '../../components/PremiumGate';
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
  return (
    <PremiumGate feature="The AI peptide assistant">
      <AssistantContent />
    </PremiumGate>
  );
}

function AssistantContent() {
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
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Peptide Assistant</Text>
            <Text style={styles.welcomeSubtitle}>
              Ask about dosing, interactions, cycling, or compare peptides side-by-side.
            </Text>
            <View style={styles.chips}>
              {SUGGESTED_QUERIES.map((q, i) => (
                <AnimatedPressable
                  key={i}
                  style={styles.chip}
                  onPress={() => handleSend(q)}
                  haptic="light"
                  scaleDown={0.93}
                >
                  <Ionicons name="chatbubble-outline" size={12} color={colors.primary} />
                  <Text style={styles.chipText}>{q}</Text>
                </AnimatedPressable>
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
        <AnimatedPressable
          style={[styles.sendBtn, !input.trim() && { opacity: 0.3 }]}
          onPress={() => handleSend(input)}
          disabled={!input.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          haptic="light"
          scaleDown={0.9}
        >
          <Ionicons name="arrow-up" size={20} color="#ffffff" />
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: Spacing.xl, paddingBottom: Spacing.sm },
    // Welcome
    welcome: { alignItems: 'center', paddingVertical: Spacing.xxxl * 2 },
    welcomeIcon: {
      width: 60, height: 60, borderRadius: 18,
      backgroundColor: colors.primaryLight,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    welcomeTitle: {
      fontSize: FontSize.xxl, fontWeight: '800', color: colors.text,
      letterSpacing: -0.5,
    },
    welcomeSubtitle: {
      fontSize: FontSize.md, color: colors.textSecondary, textAlign: 'center',
      lineHeight: 22, paddingHorizontal: Spacing.xxl, marginTop: Spacing.sm,
    },
    chips: {
      flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
      gap: Spacing.sm, marginTop: Spacing.xxl, paddingHorizontal: Spacing.lg,
    },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.card, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      ...Shadows.sm,
    },
    chipText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' },
    // Chat
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.lg,
      borderBottomRightRadius: 4,
      padding: Spacing.md, paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      maxWidth: '80%',
      ...Shadows.sm,
    },
    userText: { color: '#ffffff', fontSize: FontSize.md, lineHeight: 22 },
    // Input
    inputRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      padding: Spacing.md, paddingBottom: Spacing.xl,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
      backgroundColor: colors.card,
    },
    input: {
      flex: 1, backgroundColor: colors.input,
      borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      fontSize: FontSize.md, color: colors.text,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      ...Shadows.glow(colors.primary),
    },
  });
}
