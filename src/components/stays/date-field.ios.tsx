import { DatePicker, Host } from "@expo/ui/swift-ui";
import { View } from "react-native";

import { Text } from "@/components/ui";
import { localDate, localDateString } from "@/lib/booking";

export type DateFieldProps = {
  label: string;
  /** YYYY-MM-DD */
  value: string;
  /** Earliest selectable YYYY-MM-DD */
  min: string;
  onChange: (date: string) => void;
};

// A label and SwiftUI's compact date button, which opens the system calendar (Android: date-field.tsx)
export function DateField({ label, value, min, onChange }: DateFieldProps) {
  return (
    <View className="min-h-13 flex-row items-center justify-between gap-4">
      <Text weight="medium">{label}</Text>
      <Host matchContents>
        <DatePicker
          selection={localDate(value)}
          range={{ start: localDate(min) }}
          displayedComponents={["date"]}
          onDateChange={(d) => onChange(localDateString(d))}
        />
      </Host>
    </View>
  );
}
