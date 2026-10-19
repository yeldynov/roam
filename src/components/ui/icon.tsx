import type { LucideIcon, LucideProps } from "lucide-react-native";
import { styled } from "nativewind";

const sizes = { sm: 16, md: 20, lg: 24 } as const;

type BaseProps = LucideProps & { icon: LucideIcon; filled?: boolean; className?: unknown };

function IconBase({ icon: Lucide, filled, color, className, ...props }: BaseProps) {
  // Native resolves the class into `color`. Web gets no color, only an RN-web style object in
  // `className`; passing it as `style` puts the class on the <svg>, where currentColor follows it.
  const tint = color ?? "currentColor";
  return <Lucide color={tint} fill={filled ? tint : "none"} style={className as LucideProps["style"]} {...props} />;
}

// Resolves the `text-*` class to a color and hands it to lucide's `color` prop on native
const StyledIcon = styled(IconBase, { className: { target: false, nativeStyleMapping: { color: true } } });

export type IconProps = {
  icon: LucideIcon;
  size?: keyof typeof sizes;
  /** A `text-*` token class for the color (default `text-ink`) */
  className?: string;
  filled?: boolean;
  strokeWidth?: number;
};

export function Icon({ icon, size = "md", className = "text-ink", filled, strokeWidth = 2 }: IconProps) {
  return <StyledIcon icon={icon} className={className} size={sizes[size]} filled={filled} strokeWidth={strokeWidth} />;
}
