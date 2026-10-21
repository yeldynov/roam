import type { ReactNode } from "react";
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Stays fade in and out and the rest slide into place when a filter or query changes.
// Layout animations skip themselves under Reduce Motion (ReduceMotion.System default).
export function Reflow({ children }: { children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeIn.duration(200).easing(EASE_OUT)}
      exiting={FadeOut.duration(150).easing(EASE_OUT)}
      layout={LinearTransition.duration(200).easing(EASE_OUT)}
    >
      {children}
    </Animated.View>
  );
}
