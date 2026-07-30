const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

interface DateKeyParts {
  year: number;
  month: number;
  day: number;
}

function getDateParts(date: Date, timeZone: string): DateTimeParts {
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

  const values = new Map(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  const hour = values.get("hour");
  const minute = values.get("minute");
  const second = values.get("second");

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined
  ) {
    throw new Error("Unable to determine timezone date parts.");
  }

  return { year, month, day, hour, minute, second };
}

function parseDateKey(dateKey: string): DateKeyParts {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    throw new Error("Invalid date key.");
  }

  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) {
    throw new Error("Invalid date key.");
  }

  const [yearText, monthText, dayText] = dateKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const validationDate = new Date(Date.UTC(year, month - 1, day));
  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    throw new Error("Invalid calendar date.");
  }

  return { year, month, day };
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
  const { year, month, day } = parseDateKey(dateKey);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  let result = new Date(wallClockAsUtc);
  const offset = getTimeZoneOffsetMs(result, timeZone);
  result = new Date(wallClockAsUtc - offset);

  const correctedOffset = getTimeZoneOffsetMs(result, timeZone);
  if (correctedOffset !== offset) {
    result = new Date(wallClockAsUtc - correctedOffset);
  }

  return result;
}

function addCalendarDays(dateKey: string, days: number): string {
  const { year, month, day } = parseDateKey(dateKey);
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

  const values = new Map(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (!year || !month || !day) {
    throw new Error("Unable to determine timezone date key.");
  }

  return `${year}-${month}-${day}`;
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
