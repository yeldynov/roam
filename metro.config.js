const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Native-only packages break the web export, which exists only to carry the API routes to EAS Hosting
const nativeOnly = ["@stripe/stripe-react-native", "@expo/ui"];
const webStub = path.resolve(__dirname, "src/lib/native-only-web-stub.js");
const stripeWorker = path.resolve(__dirname, "node_modules/stripe/cjs/stripe.cjs.worker.js");
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isNativeOnly = nativeOnly.some((name) => moduleName === name || moduleName.startsWith(`${name}/`));
  if (platform === "web" && isNativeOnly) return { type: "sourceFile", filePath: webStub };
  // API routes run on Cloudflare Workers, which can't load Stripe's Node build; its worker build uses fetch and Web Crypto
  if (platform === "web" && moduleName === "stripe") return { type: "sourceFile", filePath: stripeWorker };
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativewind(config);
