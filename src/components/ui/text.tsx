import { Text as RNText, type TextProps as RNTextProps } from "react-native";

const variants = {
  hero: "text-hero font-extrabold",
  display: "text-display font-extrabold",
  title: "text-title font-extrabold",
  headline: "text-headline font-bold",
  body: "text-body font-regular",
  lead: "text-lead font-regular",
  button: "text-button font-semibold",
  caption: "text-caption font-medium",
  small: "text-small font-medium",
} as const;

const tones = {
  ink: "text-ink",
  muted: "text-muted",
  placeholder: "text-placeholder",
  white: "text-white",
  success: "text-success",
  danger: "text-danger",
  info: "text-info",
  lavender: "text-lavender-ink",
} as const;

const weights = {
  regular: "font-regular",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
} as const;

export type TextProps = RNTextProps & {
  variant?: keyof typeof variants;
  tone?: keyof typeof tones;
  /** Overrides the variant's family; set it instead of a `font-*` class */
  weight?: keyof typeof weights;
  underline?: boolean;
  /** Layout only (margins, flex). Use variant/tone/weight for type and color */
  className?: string;
};

export function Text({ variant = "body", tone = "ink", weight, underline, className, ...props }: TextProps) {
  const type = weight ? variants[variant].replace(/font-\w+/, weights[weight]) : variants[variant];
  return <RNText className={`${type} ${tones[tone]} ${underline ? "underline" : ""} ${className ?? ""}`} {...props} />;
}
