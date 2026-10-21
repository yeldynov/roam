import { styled } from "nativewind";
import { View } from "react-native";
import Svg, { Path, type SvgProps } from "react-native-svg";

// Generated from PlusJakartaSans-Bold.ttf outlines (tracking -40, stroke 36 for extra weight).
// Source asset: assets/images/roam-wordmark.svg. Regenerate both together, don't hand-edit the path.
const VIEW_BOX = "43 -574 2335 604";
const RATIO = 2335 / 604;
const D =
  "M61 0V-544H184V-423L174 -441Q193 -502 233.5 -526.0Q274 -550 331 -550H363V-434H316Q260 -434 226.0 -399.5Q192 -365 192 -303V0Z M661.0 12Q581.0 12 515.5 -25.0Q450.0 -62 411.5 -126.0Q373.0 -190 373.0 -272Q373.0 -354 411.5 -418.0Q450.0 -482 515.0 -519.0Q580.0 -556 661.0 -556Q741.0 -556 806.0 -519.0Q871.0 -482 909.5 -418.5Q948.0 -355 948.0 -272Q948.0 -190 909.0 -126.0Q870.0 -62 805.0 -25.0Q740.0 12 661.0 12ZM661.0 -108Q705.0 -108 738.5 -129.0Q772.0 -150 791.5 -187.5Q811.0 -225 811.0 -272Q811.0 -320 791.5 -356.5Q772.0 -393 738.5 -414.5Q705.0 -436 661.0 -436Q616.0 -436 582.0 -414.5Q548.0 -393 528.5 -356.5Q509.0 -320 509.0 -272Q509.0 -225 528.5 -187.5Q548.0 -150 582.0 -129.0Q616.0 -108 661.0 -108Z M1172.0 12Q1115.0 12 1073.0 -7.0Q1031.0 -26 1008.0 -61.5Q985.0 -97 985.0 -144Q985.0 -189 1005.0 -224.5Q1025.0 -260 1067.0 -284.0Q1109.0 -308 1173.0 -318L1351.0 -347V-247L1198.0 -221Q1159.0 -214 1140.0 -196.0Q1121.0 -178 1121.0 -149Q1121.0 -121 1142.5 -104.5Q1164.0 -88 1196.0 -88Q1237.0 -88 1268.5 -105.5Q1300.0 -123 1317.5 -154.0Q1335.0 -185 1335.0 -222V-362Q1335.0 -397 1307.5 -420.5Q1280.0 -444 1235.0 -444Q1193.0 -444 1160.5 -421.5Q1128.0 -399 1113.0 -362L1006.0 -414Q1022.0 -457 1056.5 -488.5Q1091.0 -520 1138.0 -538.0Q1185.0 -556 1240.0 -556Q1307.0 -556 1358.0 -531.5Q1409.0 -507 1437.5 -463.5Q1466.0 -420 1466.0 -362V0H1342.0V-93L1370.0 -95Q1349.0 -60 1320.0 -36.5Q1291.0 -13 1254.0 -0.5Q1217.0 12 1172.0 12Z M1547.0 0V-544H1670.0V-418L1656.0 -439Q1671.0 -498 1716.0 -527.0Q1761.0 -556 1822.0 -556Q1889.0 -556 1940.0 -521.0Q1991.0 -486 2006.0 -429L1969.0 -426Q1994.0 -491 2044.0 -523.5Q2094.0 -556 2159.0 -556Q2217.0 -556 2262.5 -530.0Q2308.0 -504 2334.0 -457.5Q2360.0 -411 2360.0 -350V0H2229.0V-319Q2229.0 -355 2216.0 -381.0Q2203.0 -407 2180.0 -421.5Q2157.0 -436 2124.0 -436Q2093.0 -436 2069.0 -421.5Q2045.0 -407 2032.0 -381.0Q2019.0 -355 2019.0 -319V0H1888.0V-319Q1888.0 -355 1875.0 -381.0Q1862.0 -407 1838.5 -421.5Q1815.0 -436 1783.0 -436Q1752.0 -436 1728.0 -421.5Q1704.0 -407 1691.0 -381.0Q1678.0 -355 1678.0 -319V0Z";

const sizes = { sm: 20, md: 32, hero: 38, lg: 48 } as const;

// Same color path as Icon: native resolves the class into `color`, web passes an RN-web style in `className`
function WordmarkBase({ color, height, className }: { color?: string; height: number; className?: unknown }) {
  return (
    // The View carries a11y: `accessible` on Svg leaks to the DOM on web as an invalid attribute
    <View accessible accessibilityRole="image" accessibilityLabel="roam">
    <Svg
      width={height * RATIO}
      height={height}
      viewBox={VIEW_BOX}
      style={className as SvgProps["style"]}
    >
      <Path d={D} fill={color ?? "currentColor"} stroke={color ?? "currentColor"} strokeWidth={36} strokeLinejoin="round" />
    </Svg>
    </View>
  );
}

const StyledWordmark = styled(WordmarkBase, { className: { target: false, nativeStyleMapping: { color: true } } });

export type WordmarkProps = {
  size?: keyof typeof sizes;
  /** A `text-*` token class for the color (default `text-ink`) */
  className?: string;
};

export function Wordmark({ size = "md", className = "text-ink" }: WordmarkProps) {
  return (
<StyledWordmark className={className} height={sizes[size]} />
  );
}
