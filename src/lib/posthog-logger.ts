import type { LogAttributes } from "posthog-react-native";

import { posthog } from "@/lib/posthog";

export const posthogLogger = {
  info: (message: string, attributes: LogAttributes) => posthog?.logger.info(message, attributes),
  error: (message: string, attributes: LogAttributes) => posthog?.logger.error(message, attributes),
};
