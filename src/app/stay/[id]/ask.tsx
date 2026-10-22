import { router, useLocalSearchParams } from "expo-router";
import { ArrowUp, ChevronLeft, MessageCircle } from "lucide-react-native";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnswerCard } from "@/components/stays/answer-card";
import { Alert, Button, Chip, IconButton, Input, Text } from "@/components/ui";
import { answerCards, NO_ANSWER, TOPICS, topicsFor, type AnswerCard as AnswerCardData } from "@/lib/ask";
import { useStay, type StayDetails } from "@/lib/stays";

type Message = { question: string; answers: AnswerCardData[] };

const ask = (question: string, stay: StayDetails): Message => ({ question, answers: answerCards(topicsFor(question), stay) });

export default function AskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stay, error, retry } = useStay(id);
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-3 px-4 pb-3">
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <View className="flex-1">
          <Text variant="headline">Ask about this stay</Text>
          {stay && (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {stay.title}
            </Text>
          )}
        </View>
      </View>
      {stay ? (
        <Chat stay={stay} />
      ) : error ? (
        <View className="flex-1 justify-center gap-4 px-5">
          <Alert tone="danger" message="Couldn't load this stay. Check your connection and try again." />
          <Button variant="secondary" title="Try again" icon={null} onPress={retry} />
        </View>
      ) : stay === null ? (
        <View className="flex-1 justify-center gap-2 px-5">
          <Text variant="headline" className="text-center">
            This stay isn&apos;t available
          </Text>
          <Button variant="secondary" title="Back" icon={null} className="mt-2" onPress={() => router.back()} />
        </View>
      ) : (
        <Text tone="muted" className="px-5 pt-4">
          Loading…
        </Text>
      )}
    </View>
  );
}

function Chat({ stay }: { stay: StayDetails }) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  // Sample exchange until answers come from the Ask API
  const [messages, setMessages] = useState(() => [ask(TOPICS[0].question, stay)]);
  const [text, setText] = useState("");

  const send = (question: string) => {
    if (!question.trim()) return;
    setMessages((m) => [...m, ask(question.trim(), stay)]);
    setText("");
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scroll}
        className="flex-1"
        contentContainerClassName="gap-4 px-5 py-4"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => scroll.current?.scrollToEnd()}
      >
        {messages.map((m, i) => (
          <View key={i} className="gap-4">
            <View className="max-w-4/5 self-end rounded-lg bg-lavender px-4 py-3">
              <Text>{m.question}</Text>
            </View>
            <View className="gap-3">
              {m.answers.length ? m.answers.map((a, j) => <AnswerCard key={j} {...a} />) : <Text tone="muted">{NO_ANSWER}</Text>}
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="gap-3 border-t border-line pt-3" style={{ paddingBottom: insets.bottom + 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-2 px-5">
          {TOPICS.map((t) => (
            <Chip key={t.id} size="sm" label={t.label} onPress={() => send(t.question)} />
          ))}
        </ScrollView>
        <Input
          icon={MessageCircle}
          placeholder="Ask about this stay"
          value={text}
          onChangeText={setText}
          returnKeyType="send"
          onSubmitEditing={() => send(text)}
          className="mx-5"
          trailing={
            <IconButton
              icon={ArrowUp}
              size="sm"
              variant="surface"
              accessibilityLabel="Send"
              disabled={!text.trim()}
              onPress={() => send(text)}
              className={text.trim() ? "" : "opacity-40"}
            />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}
