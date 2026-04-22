export function assertInternalToken(
  authorizationHeader: string | null,
  expectedToken: string
): void {
  if (!expectedToken) {
    throw new Error("INTERNAL_API_TOKEN is not configured");
  }

  const actual = authorizationHeader?.replace(/^Bearer\s+/i, "");
  if (!actual || actual !== expectedToken) {
    const error = new Error("Unauthorized");
    error.name = "UnauthorizedError";
    throw error;
  }
}
