import { DatePickerDialog, Host } from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { Pressable } from "react-native";

import { Text } from "@/components/ui";
import { formatDate, toDateString } from "@/lib/booking";

import type { DateFieldProps } from "./date-field.ios";

// Android: a row that opens Compose's date dialog (iOS: date-field.ios.tsx).
// Compose works in UTC midnights, so dates convert with UTC helpers.
export function DateField({ label, value, min, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatDate(value)}`}
        onPress={() => setOpen(true)}
        className="min-h-13 flex-row items-center justify-between gap-4 active:opacity-70"
      >
        <Text weight="medium">{label}</Text>
        <Text>{formatDate(value)}</Text>
      </Pressable>
      {open && (
        <Host matchContents>
          <DatePickerDialog
            initialDate={value}
            selectableDates={{ start: new Date(`${min}T00:00:00Z`) }}
            onDateSelected={(d) => {
              setOpen(false);
              onChange(toDateString(d));
            }}
            onDismissRequest={() => setOpen(false)}
          />
        </Host>
      )}
    </>
  );
}
