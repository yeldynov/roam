import { ArrowUpRight, Sparkles } from "lucide-react-native";
import { TextInput, View, type TextInputProps } from "react-native";

import { Icon, PressableScale } from "@/components/ui";

export type SearchFieldProps = Pick<TextInputProps, "value" | "onChangeText" | "autoFocus"> & {
  onSubmit: () => void;
  /** Layout only */
  className?: string;
};

// The one-sentence stay search: Home submits it to Search, Search filters as the guest types
export function SearchField({ onSubmit, className, ...props }: SearchFieldProps) {
  return (
    <View className={`h-15 flex-row items-center gap-3 rounded-full bg-lavender pl-5 pr-2 ${className ?? ""}`}>
      <Icon icon={Sparkles} size="lg" />
      <TextInput
        className="h-full min-w-0 flex-1 font-medium text-caption text-ink placeholder:text-muted selection:text-lavender-ink caret-lavender-ink"
        placeholder="quiet pet friendly cabin, hot tub"
        accessibilityLabel="Describe your stay"
        returnKeyType="search"
        autoCorrect={false}
        onSubmitEditing={onSubmit}
        {...props}
      />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Search"
        onPress={onSubmit}
        className="size-11 items-center justify-center rounded-full bg-white"
      >
        <Icon icon={ArrowUpRight} size="lg" />
      </PressableScale>
    </View>
  );
}
