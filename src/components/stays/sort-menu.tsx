import { DropdownMenu, DropdownMenuItem, Host, RNHostView, Text } from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { Pressable } from "react-native";

import { SORTS, type Sort } from "@/lib/search";

import { SortLabel } from "./sort-label";

// Android (iOS uses sort-menu.ios.tsx)
export function SortMenu({ value, onChange }: { value: Sort; onChange: (sort: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORTS.find((s) => s.key === value) ?? SORTS[0];
  return (
    <Host matchContents>
      <DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)}>
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <Pressable accessibilityRole="button" onPress={() => setOpen(true)} className="active:opacity-70">
              <SortLabel label={current.label} />
            </Pressable>
          </RNHostView>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {SORTS.map((s) => (
            <DropdownMenuItem
              key={s.key}
              onClick={() => {
                setOpen(false);
                onChange(s.key);
              }}
            >
              <DropdownMenuItem.Text>
                <Text>{s.key === value ? `✓ ${s.label}` : s.label}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
