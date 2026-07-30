const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getDateParts(date: Date, timeZone: string): Record<string, number> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return formatter.formatToParts(date).reduce<Record<string, number>>(
    (parts, part) => {
      if (part.type !== "literal") {
        parts[part.type] = Number(part.value);
      }
      return parts;
    },
    {}
  );
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getDateParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function zonedMidnightToUtc(dateKey: string, timeZone: string): Date {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    throw new Error("Invalid date key.");
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  let result = new Date(wallClockAsUtc);
  let offset = getTimeZoneOffsetMs(result, timeZone);
  result = new Date(wallClockAsUtc - offset);

  const correctedOffset = getTimeZoneOffsetMs(result, timeZone);
  if (correctedOffset !== offset) {
    result = new Date(wallClockAsUtc - correctedOffset);
  }

  return result;
}

function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function getDateKeyInTimeZone(
  date: Date,
  timeZone: string
): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>(
    (values, part) => {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
      return values;
    },
    {}
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getUtcDayRange(
  dateKey: string,
  timeZone: string
): { start: Date; endExclusive: Date } {
  return {
    start: zonedMidnightToUtc(dateKey, timeZone),
    endExclusive: zonedMidnightToUtc(addCalendarDays(dateKey, 1), timeZone),
  };
}
