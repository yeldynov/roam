import { useUser } from "@clerk/expo";
import { useState } from "react";
import { Alert } from "react-native";

import { posthog } from "@/lib/posthog";
import { posthogLogger } from "@/lib/posthog-logger";

/** Saved stay IDs to when they were saved (ISO), in the guest's Clerk `unsafeMetadata.saved` */
export type SavedMap = Record<string, string>;

export type SaveSource = "search" | "stay" | "trips";

// ponytail: Clerk metadata is 8 KB in all (about 170 entries); move to a database when bookings arrive
const MAX_SAVED = 150;

/** The guest's saved stays, shared by every heart. `ids` is newest first */
export function useSaved() {
  const { user } = useUser();
  // Optimistic flips while a write is in flight: true = saved, false = removed
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const stored = (user?.unsafeMetadata.saved ?? {}) as SavedMap;

  const isSaved = (id: string) => pending[id] ?? id in stored;
  const ids = Object.keys(stored)
    .filter((id) => pending[id] !== false)
    .sort((a, b) => stored[b].localeCompare(stored[a]));
  for (const [id, on] of Object.entries(pending)) if (on && !(id in stored)) ids.unshift(id);

  const toggle = async (id: string, source: SaveSource) => {
    if (!user || id in pending) return;
    const save = !isSaved(id);
    if (save && ids.length >= MAX_SAVED) {
      Alert.alert("Saved stays are full", "You've saved the maximum number of stays. Remove one to save another.");
      return;
    }
    setPending((p) => ({ ...p, [id]: save }));
    try {
      await user.updateMetadata({ unsafeMetadata: { saved: { [id]: save ? new Date().toISOString() : null } } });
      posthog?.capture(save ? "stay_saved" : "stay_unsaved", { stay_id: id, source });
    } catch (error) {
      posthogLogger.error("stay save failed", { error_name: (error as Error).name });
      Alert.alert("Couldn't update saved stays", "Check your connection and try again.");
    } finally {
      setPending(({ [id]: _, ...rest }) => rest);
    }
  };

  return { ids, isSaved, toggle };
}
