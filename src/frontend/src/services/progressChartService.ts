import {
  getMeasurements,
  type Measurement,
} from "./measurementService";

import {
  getHydrationEntries,
  type HydrationEntry,
} from "./hydrationService";

import {
  getProfile,
  type UserProfile,
} from "./profileService";

export type ChartRange = "7" | "30" | "90" | "all";

export interface ProgressChartData {
  measurements: Measurement[];
  hydrationEntries: HydrationEntry[];
  profile: UserProfile;
}

export interface DailyHydrationChartTotal {
  date: string;
  total: number;
}

export async function getProgressChartData(): Promise<ProgressChartData> {
  const [measurements, hydrationEntries, profile] =
    await Promise.all([
      getMeasurements(),
      getHydrationEntries(),
      getProfile(),
    ]);

  return {
    measurements,
    hydrationEntries,
    profile,
  };
}

export function getRangeStartDate(
  range: ChartRange
): Date | null {
  if (range === "all") {
    return null;
  }

  const days = Number(range);
  const startDate = new Date();

  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  return startDate;
}

export function filterMeasurementsByRange(
  measurements: Measurement[],
  range: ChartRange
): Measurement[] {
  const startDate = getRangeStartDate(range);

  return [...measurements]
    .filter((measurement) => {
      if (!startDate) {
        return true;
      }

      return (
        new Date(measurement.measurementDate) >= startDate
      );
    })
    .sort(
      (a, b) =>
        new Date(a.measurementDate).getTime() -
        new Date(b.measurementDate).getTime()
    );
}

export function filterHydrationByRange(
  hydrationEntries: HydrationEntry[],
  range: ChartRange
): HydrationEntry[] {
  const startDate = getRangeStartDate(range);

  return [...hydrationEntries]
    .filter((entry) => {
      if (!startDate) {
        return true;
      }

      return new Date(entry.loggedAt) >= startDate;
    })
    .sort(
      (a, b) =>
        new Date(a.loggedAt).getTime() -
        new Date(b.loggedAt).getTime()
    );
}

export function convertHydrationToMl(
  amount: number,
  unit: string
): number {
  return unit.toLowerCase() === "ml"
    ? amount
    : amount * 29.5735;
}

export function groupHydrationByDate(
  hydrationEntries: HydrationEntry[],
  preferredUnit: "oz" | "ml",
  range: ChartRange
): DailyHydrationChartTotal[] {
  const totalsByDate = new Map<string, number>();

  hydrationEntries.forEach((entry) => {
    const dateKey = getLocalDateKey(entry.loggedAt);

    const amountMl = convertHydrationToMl(
      entry.amount,
      entry.unit
    );

    totalsByDate.set(
      dateKey,
      (totalsByDate.get(dateKey) ?? 0) + amountMl
    );
  });

  const dateRange = createHydrationDateRange(
    hydrationEntries,
    range
  );

  return dateRange.map((date) => {
    const dateKey = formatLocalDateKey(date);
    const totalMl = totalsByDate.get(dateKey) ?? 0;

    return {
      date: dateKey,
      total:
        preferredUnit === "ml"
          ? Number(totalMl.toFixed(0))
          : Number((totalMl / 29.5735).toFixed(1)),
    };
  });
}

function createHydrationDateRange(
  hydrationEntries: HydrationEntry[],
  range: ChartRange
): Date[] {
  const endDate = startOfLocalDay(new Date());

  let startDate: Date;

  if (range === "all") {
    if (hydrationEntries.length === 0) {
      return [];
    }

    const earliestEntry = hydrationEntries.reduce(
      (earliest, current) => {
        const currentDate = new Date(current.loggedAt);

        return currentDate < earliest
          ? currentDate
          : earliest;
      },
      new Date(hydrationEntries[0].loggedAt)
    );

    startDate = startOfLocalDay(earliestEntry);
  } else {
    startDate =
      getRangeStartDate(range) ??
      startOfLocalDay(new Date());
  }

  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

function startOfLocalDay(date: Date): Date {
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);

  return localDate;
}

function getLocalDateKey(dateValue: string): string {
  return formatLocalDateKey(new Date(dateValue));
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
