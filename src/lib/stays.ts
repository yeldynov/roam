import { useEffect, useEffectEvent, useState } from "react";

import { posthogLogger } from "@/lib/posthog-logger";
import { sanityFetch } from "@/lib/sanity";
import { buildSearchQuery, SEARCH_META_QUERY, type Filters, type SearchMeta, type SearchStay, type Sort } from "@/lib/search";

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

let metaPromise: Promise<SearchMeta> | undefined;

/** Places and free-cancellation policy IDs, fetched once per session (a failure is retried next time) */
function loadSearchMeta(signal: AbortSignal) {
  metaPromise ??= sanityFetch<SearchMeta>(SEARCH_META_QUERY).catch((error: Error) => {
    metaPromise = undefined;
    throw error;
  });
  return Promise.race([
    metaPromise,
    new Promise<never>((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))),
  ]);
}

/** Search meta for the parser and query; `meta` is null until loaded */
export function useSearchMeta() {
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<Error>();
  useEffect(() => {
    const controller = new AbortController();
    loadSearchMeta(controller.signal).then(setMeta, (e: Error) => !controller.signal.aborted && setError(e));
    return () => controller.abort();
  }, [attempt]);
  return {
    meta,
    error,
    retry: () => {
      setError(undefined);
      setAttempt((n) => n + 1);
    },
  };
}

/**
 * Runs a search for `filters` and `sort` whenever `runId` changes (submit, chip, sheet, sort).
 * Each run aborts the one before. `onDone` gets the result count once per completed run.
 */
export function useStaySearch(filters: Filters, sort: Sort, meta: SearchMeta | null, runId: number, onDone: (count: number) => void) {
  const [state, setState] = useState<{ stays?: SearchStay[]; error?: Error; runId?: number }>({});
  const [attempt, setAttempt] = useState(0);
  // Reads the filters, sort and callback of the render that started the run
  const runSearch = useEffectEvent((meta: SearchMeta, signal: AbortSignal) => {
    const { query, params } = buildSearchQuery(filters, sort, meta);
    sanityFetch<SearchStay[]>(query, params, signal).then(
      (stays) => {
        setState({ stays, runId });
        onDone(stays.length);
      },
      (error: Error) => {
        if (signal.aborted) return;
        posthogLogger.error("stay search failed", { source: "sanity_cdn", error_name: error.name });
        setState({ error, runId });
      },
    );
  });

  useEffect(() => {
    if (!meta) return;
    const controller = new AbortController();
    runSearch(meta, controller.signal);
    return () => controller.abort();
  }, [meta, runId, attempt]);

  // Stale results stay hidden while a new run loads
  const current = state.runId === runId;
  return {
    stays: current ? state.stays : undefined,
    error: current ? state.error : undefined,
    loading: !current,
    retry: () => {
      setState({});
      setAttempt((n) => n + 1);
    },
  };
}
