export function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null) {
    const obj = e as Record<string, unknown>;
    if (obj.cause instanceof Error) return obj.cause.message;
    if (typeof obj.cause === "object" && obj.cause !== null) {
      const cause = obj.cause as Record<string, unknown>;
      if (typeof cause.message === "string") return cause.message;
      if (typeof cause.name === "string") return cause.name;
    }
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj._tag === "string") {
      if (typeof obj.message === "string") return `${obj._tag}: ${obj.message}`;
      return obj._tag;
    }
  }
  return String(e);
}
