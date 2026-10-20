// mock: replaced by Clerk. Every call waits like a network round trip.
const wait = () => new Promise((r) => setTimeout(r, 600));

// Clerk's test-mode code, so the wrong-code state can be tried
export const MOCK_CODE = "424242";

export async function signUp(_: { name: string; email: string; password: string }) {
  await wait();
}

export async function signIn(_: { email: string; password: string }) {
  await wait();
}

export async function verify(code: string) {
  await wait();
  if (code !== MOCK_CODE) throw new Error("That code isn't right. Try again.");
}

export async function resend(_email: string) {
  await wait();
}

export async function social(_provider: "google" | "apple") {
  await wait();
}
