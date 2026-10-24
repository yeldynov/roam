// Server only: holds the Stripe restricted key. Import from `src/app/api/**` alone, never from app code.
import Stripe from "stripe";

let client: Stripe | undefined;

/**
 * The Stripe client, created on first use: EAS Hosting fills `process.env` per request, and the constructor
 * throws without a key, which at import time takes the whole route down.
 * The fetch client works on EAS Hosting (Cloudflare Workers) as well as in the dev server.
 * API version is the SDK's pinned default (2026-09-30.endive).
 */
export const stripe = () => (client ??= new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { httpClient: Stripe.createFetchHttpClient() }));

/** Verifies a webhook's signature with Web Crypto, which Workers require */
export const constructWebhookEvent = (body: string, signature: string) =>
  stripe().webhooks.constructEventAsync(body, signature, process.env.STRIPE_WEBHOOK_SECRET ?? "", undefined, Stripe.createSubtleCryptoProvider());
