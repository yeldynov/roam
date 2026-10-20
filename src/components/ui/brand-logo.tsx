import { Image, type ImageSource } from "expo-image";

export type BrandLogoProps = { size?: number };

// Official marks from assets/; expo-image renders SVG natively, so no transformer is needed
function logo(source: ImageSource) {
  return function BrandLogo({ size = 24 }: BrandLogoProps) {
    return (
      <Image
        source={source}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    );
  };
}

export const GoogleLogo = logo(require("@/assets/images/Google.svg"));
export const AppleLogo = logo(require("@/assets/images/Apple.svg"));
