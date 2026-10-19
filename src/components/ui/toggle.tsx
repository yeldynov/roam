import { styled } from "nativewind";
import { Switch, type SwitchProps } from "react-native";

// ponytail: web can't resolve the class to a color, so the track keeps the browser default there
function ToggleBase({ color, className: _web, ...props }: SwitchProps & { color?: string; className?: unknown }) {
  return <Switch trackColor={{ true: color }} {...props} />;
}

// `text-primary` resolves to the on-track color, keeping hex out of JS
const StyledToggle = styled(ToggleBase, { className: { target: false, nativeStyleMapping: { color: true } } });

export function Toggle(props: SwitchProps) {
  return <StyledToggle className="text-primary" {...props} />;
}
