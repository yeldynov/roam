import { Children, Fragment, type ReactNode } from "react";
import { View } from "react-native";

import { Text } from "./text";

export type ListGroupProps = {
  title?: string;
  /** `ListRow variant="menu"` rows; falsy children are skipped */
  children: ReactNode;
  /** Layout only */
  className?: string;
};

// Canvas section with a white inner card; dividers start after the 40pt icon tile + 16 gap
export function ListGroup({ title, children, className }: ListGroupProps) {
  const rows = Children.toArray(children);
  return (
    <View className={`rounded-xl bg-canvas p-2 ${className ?? ""}`}>
      {title && (
        <Text variant="headline" className="px-3 pb-3 pt-3">
          {title}
        </Text>
      )}
      <View className="rounded-lg bg-surface px-3 py-1">
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View className="ml-14 h-px bg-line" />}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}
