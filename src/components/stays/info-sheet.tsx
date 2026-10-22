import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Modal, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton, Text } from "@/components/ui";

export type InfoSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// Read-only page sheet for a stay's policies and host
export function InfoSheet({ visible, title, onClose, children }: InfoSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-surface">
        <View className="flex-row items-center justify-between gap-4 px-5 pb-2 pt-6">
          <Text variant="title" className="flex-1">
            {title}
          </Text>
          <IconButton icon={X} size="sm" accessibilityLabel="Close" onPress={onClose} />
        </View>
        <ScrollView contentContainerClassName="gap-4 px-5 pt-4" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Plain text with blank-line paragraphs, word for word */
export function Paragraphs({ text }: { text: string }) {
  return text
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p, i) => <Text key={i}>{p.trim()}</Text>);
}
