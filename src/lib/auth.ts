import { isClerkAPIResponseError } from "@clerk/expo";

// Clerk's messages are written for end users ("Password is incorrect…"), so the auth screens show them as is
export function authMessage(error: unknown) {
  if (isClerkAPIResponseError(error)) return error.errors[0]?.longMessage ?? error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Try again.";
}
