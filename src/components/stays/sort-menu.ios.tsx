import { Button, Host, Menu, RNHostView } from "@expo/ui/swift-ui";
import { StyleSheet, View } from "react-native";

import { SORTS, type Sort } from "@/lib/search";

import { SortLabel } from "./sort-label";

export function SortMenu({ value, onChange }: { value: Sort; onChange: (sort: Sort) => void }) {
  const current = SORTS.find((s) => s.key === value) ?? SORTS[0];
  return (
    // A matchContents Host came out 0 wide in a flex row, so an invisible RN copy of the label sizes it
    <View>
      <View style={{ opacity: 0 }} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <SortLabel label={current.label} />
      </View>
      <Host style={StyleSheet.absoluteFill}>
        <Menu
          label={
            <RNHostView>
              <SortLabel label={current.label} />
            </RNHostView>
          }
        >
          {SORTS.map((s) => (
            <Button key={s.key} label={s.label} systemImage={s.key === value ? "checkmark" : undefined} onPress={() => onChange(s.key)} />
          ))}
        </Menu>
      </Host>
    </View>
  );
}
