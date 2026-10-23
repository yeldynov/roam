import { useAuth } from "@clerk/expo";
import { useEffect, useState } from "react";

import { posthogLogger } from "@/lib/posthog-logger";

/** Calls one of Roam's API routes as the signed-in guest. Relative paths resolve to the dev server or the hosted origin. */
export async function apiFetch(path: string, token: string | null, init: RequestInit = {}) {
  return fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }), ...init.headers },
  });
}

export type Quote = { bookingId: string; clientSecret: string; nights: number; nightlyPrice: number; total: number };

/** Mirrors `Trip` in src/lib/server/bookings-store.ts */
export type Trip = {
  id: string;
  stayId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalCents: number;
  stay: { title: string; location: string; image: string } | null;
};

/** The guest's confirmed bookings, by check-in. Refetches when `refreshKey` changes (e.g. the tab gains focus). */
export function useTrips(refreshKey: number) {
  const { getToken } = useAuth();
  const [state, setState] = useState<{ trips?: Trip[]; error?: Error }>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const res = await apiFetch("/api/bookings", await getToken());
      if (!res.ok) throw new Error(`Trips failed: ${res.status}`);
      return ((await res.json()) as { trips: Trip[] }).trips;
    })().then(
      (trips) => live && setState({ trips }),
      (error: Error) => {
        if (!live) return;
        posthogLogger.error("trips load failed", { source: "api", error_name: error.name });
        setState((s) => (s.trips ? s : { error }));
      },
    );
    return () => {
      live = false;
    };
  }, [getToken, refreshKey, attempt]);

  return {
    trips: state.trips,
    error: state.error,
    loading: !state.trips && !state.error,
    retry: () => {
      setState({});
      setAttempt((n) => n + 1);
    },
  };
}
