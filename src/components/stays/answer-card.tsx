import { FileText } from "lucide-react-native";
import { View } from "react-native";

import { Icon, Text } from "@/components/ui";
import type { AnswerCard as AnswerCardData } from "@/lib/ask";

import { Paragraphs } from "./info-sheet";

// One topic's answer, word for word, labeled with where the text comes from
export function AnswerCard({ source, title, body }: AnswerCardData) {
  return (
    <View className="gap-2 rounded-md bg-canvas p-4">
      <View className="flex-row items-center gap-1.5">
        <Icon icon={FileText} size="sm" className="text-muted" />
        <Text variant="caption" tone="muted">
          {source}
        </Text>
      </View>
      {title && <Text variant="headline">{title}</Text>}
      <Paragraphs text={body} />
    </View>
  );
}
