import { useEffect, useState } from "react";

import { posthogLogger } from "@/lib/posthog-logger";
import { sanityFetch } from "@/lib/sanity";

/** What a stay card needs; the full stay is fetched by the stay details screen */
export type StaySummary = {
  id: string;
  title: string;
  /** "City, Region" */
  location: string;
  propertyType: string;
  setting: string;
  rating: number;
  /** Cover photo, Sanity CDN URL */
  image: string;
};

const STAYS_QUERY = `*[_type == "property" && defined(photos[0].asset)] | order(rating desc, title asc){
  "id": _id,
  title,
  "location": location.city + ", " + location.region,
  propertyType,
  setting,
  rating,
  "image": photos[0].asset->url
}`;

/** Every published stay, highest rated first. `retry` refetches after an error. */
export function useStays() {
  const [state, setState] = useState<{ stays?: StaySummary[]; error?: Error }>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    sanityFetch<StaySummary[]>(STAYS_QUERY, {}, controller.signal).then(
      (stays) => {
        posthogLogger.info("stay catalog loaded", {
          source: "sanity_cdn",
          result_count: stays.length,
        });
        setState({ stays });
      },
      (error: Error) => {
        if (!controller.signal.aborted) {
          posthogLogger.error("stay catalog load failed", {
            source: "sanity_cdn",
            error_name: error.name,
          });
          setState({ error });
        }
      },
    );
    return () => controller.abort();
  }, [attempt]);

  return {
    stays: state.stays,
    error: state.error,
    loading: !state.stays && !state.error,
    retry: () => {
      posthogLogger.info("stay catalog reload requested", { source: "sanity_cdn" });
      setState({});
      setAttempt((n) => n + 1);
    },
  };
}
