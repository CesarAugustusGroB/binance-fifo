const MADRID_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

export function truncateToMinute(input: Date): Date {
  const copy = new Date(input);
  copy.setUTCSeconds(0, 0);
  return copy;
}

export function toMadridDateTime(input: Date): string {
  return MADRID_FORMATTER.format(input).replace(" ", "T");
}

export function madridYear(input: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric"
    }).format(input)
  );
}
