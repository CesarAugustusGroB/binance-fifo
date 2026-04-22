export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown
  ) {
    super(message);
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.name === "UnauthorizedError";
}
