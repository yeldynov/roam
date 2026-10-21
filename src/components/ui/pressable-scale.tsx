import { useState, type ReactNode } from "react";
import { Pressable, View, type PressableProps } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";

export type PressableScaleProps = Omit<PressableProps, "children" | "style"> & {
  children: ReactNode;
  /** Applied to the scaling view: put the visual and layout classes here */
  className?: string;
};

// Press feedback: 3% scale in 120ms on press-in, a CSS transition on the UI thread
export function PressableScale({ children, className, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      pressRetentionOffset={16}
      {...props}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    >
      {/* Animated.View takes the transition; the plain View takes the classes */}
      <Animated.View style={pressScale(pressed)}>
        <View className={className}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

/** The press style, for components that scale a view other than their Pressable (ListingCard) */
export const pressScale = (pressed: boolean) => [base, pressed && { transform: [{ scale: 0.97 }] }];

const base = {
  transform: [{ scale: 1 }],
  transitionProperty: "transform",
  transitionDuration: 120,
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
} as const;
