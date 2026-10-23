import { useAuth } from "@clerk/expo";
import { useStripe } from "@stripe/stripe-react-native";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { CircleCheck, ChevronLeft, FileText } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DateField } from "@/components/stays/date-field";
import { InfoSheet, Paragraphs } from "@/components/stays/info-sheet";
import { Alert, Button, Icon, IconButton, ListRow, Stepper, Text } from "@/components/ui";
import {
  addDays,
  BOOKING_PROBLEM_TEXT,
  formatDate,
  localDateString,
  nightsBetween,
  priceBooking,
  validateBooking,
  type BookingProblem,
} from "@/lib/booking";
import { apiFetch, type Quote } from "@/lib/booking-api";
import { posthog } from "@/lib/posthog";
import { useStay, type StayDetails } from "@/lib/stays";

const GENERIC_ERROR = "Something went wrong. Check your connection and try again.";
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stay, error, retry } = useStay(id);
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-3 px-4 pb-3">
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <View className="flex-1">
          <Text variant="headline">Book</Text>
          {stay && (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {stay.title}
            </Text>
          )}
        </View>
      </View>
      {stay ? (
        <BookForm stay={stay} />
      ) : error ? (
        <View className="flex-1 justify-center gap-4 px-5">
          <Alert tone="danger" message="Couldn't load this stay. Check your connection and try again." />
          <Button variant="secondary" title="Try again" icon={null} onPress={retry} />
        </View>
      ) : stay === null ? (
        <View className="flex-1 justify-center gap-2 px-5">
          <Text variant="headline" className="text-center">
            This stay isn&apos;t available
          </Text>
          <Button variant="secondary" title="Back" icon={null} className="mt-2" onPress={() => router.back()} />
        </View>
      ) : (
        <Text tone="muted" className="px-5 pt-4">
          Loading…
        </Text>
      )}
    </View>
  );
}

type Phase = "idle" | "quoting" | "paying" | "confirming" | "confirmed" | "received";

function BookForm({ stay }: { stay: StayDetails }) {
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const today = localDateString(new Date());
  const [checkIn, setCheckIn] = useState(() => addDays(today, 1));
  const [checkOut, setCheckOut] = useState(() => addDays(today, 3));
  const [guests, setGuests] = useState(Math.min(2, stay.maxGuests));
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [policyOpen, setPolicyOpen] = useState(false);
  const alive = useRef(true);
  const nights = nightsBetween(checkIn, checkOut);
  const estimate = priceBooking(nights, stay.nightlyPrice);
  const props = { stay_id: stay.id, nights, guests };

  useEffect(() => {
    posthog?.capture("booking_started", { stay_id: stay.id });
    return () => {
      alive.current = false;
    };
  }, [stay.id]);

  const changeCheckIn = (date: string) => {
    setCheckIn(date);
    if (nightsBetween(date, checkOut) < 1) setCheckOut(addDays(date, 1));
  };

  const failQuote = (reason: BookingProblem | "unavailable" | "error") => {
    posthog?.capture("booking_quote_failed", { ...props, reason });
    setProblem(reason === "error" ? GENERIC_ERROR : BOOKING_PROBLEM_TEXT[reason]);
    setPhase("idle");
  };

  async function book() {
    setProblem(null);
    const invalid = validateBooking({ checkIn, checkOut, guests }, stay, today);
    if (invalid) return failQuote(invalid);

    setPhase("quoting");
    let quote: Quote;
    try {
      const res = await apiFetch("/api/bookings", await getToken(), {
        method: "POST",
        body: JSON.stringify({ stayId: stay.id, checkIn, checkOut, guests }),
      });
      const json = await res.json();
      if (!res.ok) return failQuote(json.reason in BOOKING_PROBLEM_TEXT ? json.reason : "error");
      quote = json;
    } catch {
      return failQuote("error");
    }

    const init = await initPaymentSheet({
      paymentIntentClientSecret: quote.clientSecret,
      merchantDisplayName: "Roam",
      returnURL: Linking.createURL("stripe-redirect"),
    });
    if (init.error) {
      posthog?.capture("booking_payment_failed", { ...props, code: init.error.code });
      setProblem(GENERIC_ERROR);
      return setPhase("idle");
    }

    setPhase("paying");
    posthog?.capture("booking_payment_opened", props);
    const { error } = await presentPaymentSheet();
    if (error) {
      const cancelled = error.code === "Canceled";
      posthog?.capture(cancelled ? "booking_payment_cancelled" : "booking_payment_failed", cancelled ? props : { ...props, code: error.code });
      if (!cancelled) setProblem("Your payment didn't go through. Try again or use another card.");
      return setPhase("idle");
    }

    // Paid. The booking is confirmed by Stripe's webhook on the server, so wait for it.
    setTotal(quote.total);
    setPhase("confirming");
    for (let i = 0; i < 15 && alive.current; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await apiFetch(`/api/bookings/${quote.bookingId}`, await getToken()).catch(() => null);
      const status = res?.ok ? ((await res.json()) as { status: string }).status : null;
      if (status === "confirmed") {
        posthog?.capture("booking_completed", props);
        return alive.current && setPhase("confirmed");
      }
    }
    if (alive.current) setPhase("received");
  }

  if (phase === "confirming" || phase === "confirmed" || phase === "received") {
    const done = phase !== "confirming";
    return (
      <View className="flex-1 justify-center gap-3 px-5" style={{ paddingBottom: insets.bottom + 24 }}>
        <Icon icon={CircleCheck} size="lg" className={done ? "text-primary" : "text-placeholder"} />
        <Text variant="title">{phase === "confirmed" ? "You're booked" : phase === "received" ? "Payment received" : "Confirming your booking…"}</Text>
        <Text tone="muted">
          {stay.title} · {formatDate(checkIn)} to {formatDate(checkOut)} · {plural(guests, "guest")}
        </Text>
        <Text weight="medium">Total paid ${total}</Text>
        {phase === "received" && <Text tone="muted">Your booking will appear in Trips shortly.</Text>}
        {done && <Button title="View trips" className="mt-4" onPress={() => router.navigate("/trips")} />}
      </View>
    );
  }

  const busy = phase === "quoting" || phase === "paying";
  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 pb-6 pt-2">
        <View>
          <Text variant="headline" className="mb-1">
            Dates
          </Text>
          <DateField label="Check-in" value={checkIn} min={today} onChange={changeCheckIn} />
          <View className="h-px bg-line" />
          <DateField label="Check-out" value={checkOut} min={addDays(checkIn, 1)} onChange={setCheckOut} />
          <Text variant="caption" tone="muted" className="mt-1">
            Check-in after {stay.checkInTime} · Check-out before {stay.checkOutTime}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="headline">Guests</Text>
            <Text variant="caption" tone="muted">
              Up to {stay.maxGuests}
            </Text>
          </View>
          <Stepper value={guests} min={1} max={stay.maxGuests} onChange={setGuests} />
        </View>

        <View className="gap-2">
          <Text variant="headline">Price</Text>
          <View className="flex-row justify-between">
            <Text>
              ${stay.nightlyPrice} × {plural(Math.max(nights, 0), "night")}
            </Text>
            <Text>${Math.max(estimate.total, 0)}</Text>
          </View>
          <View className="h-px bg-line" />
          <View className="flex-row justify-between">
            <Text weight="semibold">Total (USD)</Text>
            <Text weight="semibold">${Math.max(estimate.total, 0)}</Text>
          </View>
        </View>

        <ListRow
          variant="policy"
          icon={FileText}
          title={stay.cancellationPolicy.title}
          subtitle={stay.cancellationPolicy.summary ?? undefined}
          onPress={() => setPolicyOpen(true)}
        />

        {problem && <Alert tone="danger" message={problem} onDismiss={() => setProblem(null)} />}
      </ScrollView>

      <View className="flex-row items-center gap-6 border-t border-line bg-surface px-5 pt-4" style={{ paddingBottom: insets.bottom + 8 }}>
        <View>
          <Text variant="title">${Math.max(estimate.total, 0)}</Text>
          <Text variant="caption" tone="muted">
            {plural(Math.max(nights, 0), "night")}
          </Text>
        </View>
        <Button title="Continue to payment" icon={null} loading={busy} className="flex-1" onPress={book} />
      </View>

      <InfoSheet visible={policyOpen} title={stay.cancellationPolicy.title} onClose={() => setPolicyOpen(false)}>
        <Paragraphs text={stay.cancellationPolicy.body} />
      </InfoSheet>
    </>
  );
}
