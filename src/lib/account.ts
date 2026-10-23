import { isClerkRuntimeError } from "@clerk/expo";
import type { UserResource } from "@clerk/expo/types";

/** The guest's free-text home city (Clerk `unsafeMetadata.homeCity`), or undefined when unset */
export function homeCity(user: UserResource | null | undefined) {
  const city = user?.unsafeMetadata?.homeCity;
  return typeof city === "string" && city.trim() ? city : undefined;
}

/** True when the guest closed the reverification sheet; the wrapped action never ran */
export function isReverificationCancelled(error: unknown) {
  return isClerkRuntimeError(error) && error.code === "reverification_cancelled";
}
