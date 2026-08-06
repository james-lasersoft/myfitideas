import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LocaleProvider } from "../i18n/LocaleContext";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MeasurementsPage from "./MeasurementsPage";
import {
  createMeasurement,
  getMeasurementComparison,
  getMeasurementData,
  type Measurement,
  type MeasurementComparisonValue,
  type MeasurementSessionComparison,
} from "../services/measurementService";
import {
  getBodyTransformationAnalytics,
  type BodyTransformationAnalytics,
  type BodyTransformationTrend,
} from "../services/bodyTransformationService";

vi.mock("../services/measurementService", () => ({
  createMeasurement: vi.fn(),
  getMeasurementData: vi.fn(),
  getMeasurementComparison: vi.fn(),
  getMeasurementComparisonError: vi.fn(() => "One or both selected sessions are no longer available."),
  getMeasurementError: vi.fn(() => "Unable to save measurement."),
  getMeasurementGuardrail: vi.fn(() => null),
}));

vi.mock("../services/bodyWeightService", () => ({
  createBodyWeight: vi.fn(),
  getBodyWeightError: vi.fn(() => "Unable to save body weight."),
}));

vi.mock("../services/bodyTransformationService", () => ({
  getBodyTransformationAnalytics: vi.fn(),
  getBodyTransformationAnalyticsError: vi.fn(() => "Unable to load body transformation insights."),
}));

const measurementData = {
  weights: [],
  measurementSessions: [],
  measurements: [],
  profileMetrics: {
    heightCm: 175,
    height: 68.9,
    displayUnit: "in" as const,
    bodyCompositionReference: null,
    bodyCompositionReferenceBasis: null,
    hasCompletedTwelveMonthsHormoneTherapy: false,
  },
};

const analyticsTrend = (overrides: Partial<BodyTransformationTrend> = {}): BodyTransformationTrend => ({
  startValue: 80, endValue: 78, absoluteChange: -2, percentageChange: -2.5, unitCode: "kg", observationCount: 3,
  startDate: "2026-07-10T12:00:00.000Z", endDate: "2026-08-01T12:00:00.000Z",
  direction: "DECREASING", reliability: "TREND_ELIGIBLE", ...overrides,
});
const analyticsResponse: BodyTransformationAnalytics = {
  period: { type: "LAST_30_DAYS", startDate: "2026-07-07T12:00:00.000Z", endDate: "2026-08-06T12:00:00.000Z" },
  dataSufficiency: { bodyWeightObservationCount: 3, measurementSessionCount: 2, hasAnyData: true },
  weight: analyticsTrend(),
  coreMeasurements: [
    { field: "neck", trend: analyticsTrend({ startValue: 40, endValue: 39, absoluteChange: -1, percentageChange: -2.5, unitCode: "cm" }) },
    { field: "chest", trend: analyticsTrend({ startValue: 100, endValue: 98, absoluteChange: -2, percentageChange: -2, unitCode: "cm" }) },
    { field: "waist", trend: analyticsTrend({ startValue: 90, endValue: 86, absoluteChange: -4, percentageChange: -4.4444, unitCode: "cm" }) },
    { field: "hips", trend: analyticsTrend({ startValue: null, endValue: null, absoluteChange: null, percentageChange: null, unitCode: "cm", observationCount: 0, startDate: null, endDate: null, direction: "INSUFFICIENT_DATA", reliability: "UNAVAILABLE" }) },
  ],
  pairedMeasurements: [
    { field: "upperArms", left: analyticsTrend({ endValue: 35, unitCode: "cm" }), right: analyticsTrend({ endValue: 36, unitCode: "cm" }) },
    { field: "thighs", left: analyticsTrend({ endValue: 58, unitCode: "cm" }), right: analyticsTrend({ endValue: 59, unitCode: "cm" }) },
    { field: "calves", left: analyticsTrend({ endValue: 38, unitCode: "cm" }), right: analyticsTrend({ endValue: 39, unitCode: "cm" }) },
  ],
  calculatedMetrics: [
    { field: "bmi", trend: analyticsTrend({ startValue: 26.1, endValue: 25.5, absoluteChange: -.6, percentageChange: -2.2989, unitCode: "kg_per_m2" }) },
    { field: "bodyFat", trend: analyticsTrend({ startValue: 20, endValue: 18, absoluteChange: -2, percentageChange: -10, unitCode: "percent" }) },
    { field: "waistToHeightRatio", trend: analyticsTrend({ startValue: .5, endValue: .48, absoluteChange: -.02, percentageChange: -4, unitCode: "ratio" }) },
    { field: "fatMass", trend: analyticsTrend({ startValue: 16, endValue: 14, unitCode: "kg" }) },
    { field: "leanMass", trend: analyticsTrend({ startValue: 64, endValue: 64, absoluteChange: 0, percentageChange: 0, unitCode: "kg", direction: "STABLE" }) },
  ],
  consistency: {
    bodyWeight: { observationCount: 3, coveredIntervalCount: 3, totalIntervalCount: 31, coveragePercentage: 9.68, intervalUnit: "DAY" },
    measurementSessions: { observationCount: 2, coveredIntervalCount: 2, totalIntervalCount: 5, coveragePercentage: 40, intervalUnit: "WEEK" },
  },
};

const historicalSession: Measurement = {
  id: "session-1",
  measurementSessionId: "session-1",
  bodyWeightId: null,
  calculationWeightKg: 74.84,
  weight: null,
  neck: 15,
  chest: null,
  waist: 32,
  abdomen: 34,
  hips: 38,
  leftBicep: 12,
  rightBicep: 12.5,
  leftForearm: 10,
  rightForearm: null,
  leftThigh: 22,
  rightThigh: 22.5,
  leftCalf: null,
  rightCalf: null,
  bodyFat: 18.5,
  bodyFatMethod: "US_NAVY_CIRCUMFERENCE",
  fatMass: 30,
  leanMass: 135,
  waistToHeightRatio: 0.465,
  waistToHeightRatioMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM",
  measurementDate: "2026-07-15T14:30:00.000Z",
  displayUnits: { weight: "lb", length: "in" },
};

const historicalMeasurementData = {
  ...measurementData,
  measurementSessions: [historicalSession],
  measurements: [historicalSession],
};

async function renderHistory(): Promise<{ user: UserEvent; row: HTMLElement }> {
  vi.mocked(getMeasurementData).mockResolvedValue(historicalMeasurementData);
  const user = userEvent.setup();
  render(<LocaleProvider><MemoryRouter><MeasurementsPage /></MemoryRouter></LocaleProvider>);
  const row = await screen.findByRole("row", { name: /Open session details/ });
  return { user, row };
}

async function enterValue(user: UserEvent, name: string, value: string): Promise<void> {
  await user.type(screen.getByRole("spinbutton", { name }), value);
  await user.click(screen.getByRole("button", { name: "Next" }));
}

async function skipStep(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole("button", { name: "Skip" }));
}

async function openPopulatedReview(): Promise<UserEvent> {
  const user = userEvent.setup();
  render(<LocaleProvider><MemoryRouter><MeasurementsPage /></MemoryRouter></LocaleProvider>);

  await screen.findByText("No sessions yet");
  await user.click(screen.getByRole("button", { name: "Start measurement session" }));

  await enterValue(user, "Neck in", "15");
  await skipStep(user);
  await enterValue(user, "Waist in", "32");
  await skipStep(user);
  await enterValue(user, "Hips in", "38");

  await enterValue(user, "Left upper arm in", "12");
  await skipStep(user);

  await user.type(screen.getByRole("spinbutton", { name: "Left thigh in" }), "22");
  await user.type(screen.getByRole("spinbutton", { name: "Right thigh in" }), "22.5");
  await user.click(screen.getByRole("button", { name: "Next" }));

  await skipStep(user);
  await screen.findByRole("heading", { name: "Review your measurements" });

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  return user;
}

beforeEach(() => {
  localStorage.setItem("myfitideas.locale", "en-US");
  vi.clearAllMocks();
  vi.mocked(getMeasurementData).mockResolvedValue(measurementData);
  vi.mocked(getBodyTransformationAnalytics).mockResolvedValue(analyticsResponse);
  vi.mocked(createMeasurement).mockResolvedValue({} as Awaited<ReturnType<typeof createMeasurement>>);
});

describe("Novice measurement review", () => {
  it("shows one row per core measurement and left/right pair with values, units, and statuses", async () => {
    await openPopulatedReview();

    const table = screen.getByRole("table", { name: /Entered and skipped measurements/ });
    expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "Neck",
      "Chest",
      "Waist",
      "Abdomen",
      "Hips",
      "Upper arms",
      "Forearms",
      "Thighs",
      "Calves",
    ]);

    expect(within(table).getByText("15 in")).toBeInTheDocument();
    expect(within(table).getByText("32 in")).toBeInTheDocument();
    expect(within(table).getByText(/Left 12 in .* Right skipped/)).toBeInTheDocument();
    expect(within(table).getByText(/Left 22 in .* Right 22\.5 in/)).toBeInTheDocument();
    expect(within(table).getAllByText("Skipped")).toHaveLength(4);
    expect(within(table).getByText("Partially entered")).toBeInTheDocument();
  });

  it("returns to the matching step on a row double-click without saving", async () => {
    const user = await openPopulatedReview();

    await user.dblClick(screen.getByRole("row", { name: "Edit Upper arms" }));

    expect(screen.getByRole("heading", { name: "Upper arms" })).toBeInTheDocument();
    expect(createMeasurement).not.toHaveBeenCalled();
  });

  it("returns to the matching step when Enter activates a focused row without saving", async () => {
    const user = await openPopulatedReview();
    screen.getByRole("row", { name: "Edit Neck" }).focus();

    await user.keyboard("{Enter}");

    expect(screen.getByRole("heading", { name: "Neck" })).toBeInTheDocument();
    expect(createMeasurement).not.toHaveBeenCalled();
  });

  it("returns to the matching step when Space activates a focused row without saving", async () => {
    const user = await openPopulatedReview();
    screen.getByRole("row", { name: "Edit Thighs" }).focus();

    await user.keyboard(" ");

    expect(screen.getByRole("heading", { name: "Thighs" })).toBeInTheDocument();
    expect(createMeasurement).not.toHaveBeenCalled();
  });

  it("saves only through the separate deliberate Save session action", async () => {
    const user = await openPopulatedReview();

    expect(createMeasurement).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Save session" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Save session" }));

    await waitFor(() => expect(createMeasurement).toHaveBeenCalledTimes(1));
    expect(createMeasurement).toHaveBeenCalledWith(expect.objectContaining({
      neck: 15,
      waist: 32,
      hips: 38,
      leftBicep: 12,
      leftThigh: 22,
      rightThigh: 22.5,
      lengthUnit: "in",
    }));
  });
});


describe("Body transformation intelligence", () => {
  it("loads the default period and renders backend-provided trends without recalculating", async () => {
    render(<LocaleProvider><MemoryRouter><MeasurementsPage /></MemoryRouter></LocaleProvider>);
    await waitFor(() => expect(getBodyTransformationAnalytics).toHaveBeenCalledWith({ period: "LAST_30_DAYS" }));
    const table = await screen.findByRole("table", { name: /Backend-calculated body transformation changes/ });
    expect(within(table).getByRole("row", { name: /Weight 78 kg -2 kg \(-2.5%\) Decreasing Trend eligible/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Upper arms Left: 35 cmRight: 36 cm/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Hips.*Direction unavailable No observations/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Body fat 18% -2% \(-10%\)/ })).toBeInTheDocument();
    expect(screen.getByText(/9.68%/)).toBeInTheDocument();
  });

  it("requests preset and custom periods through the API boundary", async () => {
    const user = userEvent.setup();
    render(<LocaleProvider><MemoryRouter><MeasurementsPage /></MemoryRouter></LocaleProvider>);
    const period = await screen.findByRole("combobox", { name: "Insight period" });
    await user.selectOptions(period, "LAST_7_DAYS");
    await waitFor(() => expect(getBodyTransformationAnalytics).toHaveBeenLastCalledWith({ period: "LAST_7_DAYS" }));
    await user.selectOptions(period, "CUSTOM");
    await user.type(screen.getByLabelText("Start date"), "2026-07-01");
    await user.type(screen.getByLabelText("End date"), "2026-07-31");
    await user.click(screen.getByRole("button", { name: "Apply range" }));
    await waitFor(() => expect(getBodyTransformationAnalytics).toHaveBeenLastCalledWith({
      period: "CUSTOM", startDate: "2026-07-01", endDate: "2026-07-31",
    }));
  });

  it("shows loading, empty, and API error states", async () => {
    let resolveAnalytics!: (value: BodyTransformationAnalytics) => void;
    vi.mocked(getBodyTransformationAnalytics).mockImplementation(() => new Promise((resolve) => { resolveAnalytics = resolve; }));
    const { unmount } = render(<LocaleProvider><MemoryRouter><MeasurementsPage /></MemoryRouter></LocaleProvider>);
    expect(screen.getByText("Loading body transformation insights...")).toBeInTheDocument();
    resolveAnalytics({ ...analyticsResponse, dataSufficiency: { bodyWeightObservationCount: 0, measurementSessionCount: 0, hasAnyData: false } });
    expect(await screen.findByText("No body transformation data in this period")).toBeInTheDocument();
    unmount();

    vi.mocked(getBodyTransformationAnalytics).mockRejectedValue(new Error("failed"));
    const user = userEvent.setup();
    render(<LocaleProvider><MemoryRouter><MeasurementsPage /></MemoryRouter></LocaleProvider>);
    const period = await screen.findByRole("combobox", { name: "Insight period" });
    await user.selectOptions(period, "LAST_90_DAYS");
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load body transformation insights.");
  });
});


describe("Historical measurement session details", () => {
  it("opens by click and shows complete read-only measurements and calculated results", async () => {
    const { user, row } = await renderHistory();

    await user.click(row);

    const dialog = screen.getByRole("dialog", { name: "Measurement session details" });
    expect(within(dialog).getByRole("heading", { name: "Measurement session details" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();

    const table = within(dialog).getByRole("table", { name: "All recorded and unrecorded body measurements for this session." });
    expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "Neck",
      "Chest",
      "Waist",
      "Abdomen",
      "Hips",
      "Upper arms",
      "Forearms",
      "Thighs",
      "Calves",
    ]);
    expect(within(table).getByRole("row", { name: /Neck 15\.0 in/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Upper arms Left: 12\.0 inRight: 12\.5 in/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Forearms Left: 10\.0 inRight: Not recorded/ })).toBeInTheDocument();
    expect(within(table).getAllByText("Not recorded")).toHaveLength(4);

    expect(within(dialog).getByText("18.5 %")).toBeInTheDocument();
    expect(within(dialog).getByText(/Calculation method: U.S. Navy circumference estimate/)).toBeInTheDocument();
    expect(within(dialog).getByText("0.465")).toBeInTheDocument();
    expect(within(dialog).getByText(/Calculation method: Waist divided by height/)).toBeInTheDocument();
    expect(within(dialog).getByText("30.0 lb")).toBeInTheDocument();
    expect(within(dialog).getByText("135.0 lb")).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /Edit|Delete/ })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(row).toHaveFocus());
  });

  it("opens with Enter, closes with Escape, and restores focus", async () => {
    const { user, row } = await renderHistory();
    row.focus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Measurement session details" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(row).toHaveFocus());
  });

  it("opens with Space and closes from the explicit header control", async () => {
    const { user, row } = await renderHistory();
    row.focus();

    await user.keyboard(" ");
    const dialog = screen.getByRole("dialog", { name: "Measurement session details" });
    await user.click(within(dialog).getByRole("button", { name: "Close session details" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(row).toHaveFocus());
  });
});


const newerHistoricalSession: Measurement = {
  ...historicalSession,
  id: "session-2",
  measurementSessionId: "session-2",
  measurementDate: "2026-08-15T14:30:00.000Z",
  neck: 15.5,
  waist: 31,
};

const comparisonValue = (
  baselineValue: number | null,
  comparisonValue: number | null,
  displayUnit: MeasurementComparisonValue["displayUnit"],
  status: MeasurementComparisonValue["status"] = "COMPARABLE",
  absoluteChange: number | null = comparisonValue == null || baselineValue == null ? null : comparisonValue - baselineValue,
  percentageChange: number | null = baselineValue ? ((comparisonValue! - baselineValue) / baselineValue) * 100 : null
): MeasurementComparisonValue => ({
  baselineValue,
  comparisonValue,
  displayUnit,
  absoluteChange,
  percentageChange,
  status,
});

const comparisonResponse: MeasurementSessionComparison = {
  baselineSession: { id: "session-1", recordedAt: historicalSession.measurementDate },
  comparisonSession: { id: "session-2", recordedAt: newerHistoricalSession.measurementDate },
  coreMeasurements: [
    { field: "neck", value: comparisonValue(38.1, 39.37, "cm", "COMPARABLE", 1.27, 3.3333) },
    { field: "chest", value: comparisonValue(null, null, "cm", "MISSING_BOTH") },
    { field: "waist", value: comparisonValue(81.28, 78.74, "cm", "COMPARABLE", -2.54, -3.125) },
    { field: "abdomen", value: comparisonValue(86.36, 83.82, "cm") },
    { field: "hips", value: comparisonValue(96.52, 95.25, "cm") },
  ],
  pairedMeasurements: [
    { field: "upperArms", left: comparisonValue(30.48, 31.75, "cm"), right: comparisonValue(31.75, 33.02, "cm") },
    { field: "forearms", left: comparisonValue(25.4, 26.67, "cm"), right: comparisonValue(null, 26, "cm", "MISSING_BASELINE") },
    { field: "thighs", left: comparisonValue(55.88, 57.15, "cm"), right: comparisonValue(57.15, 58.42, "cm") },
    { field: "calves", left: comparisonValue(null, null, "cm", "MISSING_BOTH"), right: comparisonValue(null, null, "cm", "MISSING_BOTH") },
  ],
  calculatedMetrics: [
    { field: "bodyFat", value: comparisonValue(18.5, 17.5, "percent", "COMPARABLE", -1, -5.4054), baselineMethod: "US_NAVY_CIRCUMFERENCE", comparisonMethod: "US_NAVY_CIRCUMFERENCE" },
    { field: "waistToHeightRatio", value: comparisonValue(0.465, 0.45, "ratio", "COMPARABLE", -0.015, -3.2258), baselineMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM", comparisonMethod: "WAIST_CM_DIVIDED_BY_HEIGHT_CM" },
    { field: "fatMass", value: comparisonValue(13.61, 12.7, "kg"), baselineMethod: "US_NAVY_CIRCUMFERENCE", comparisonMethod: "US_NAVY_CIRCUMFERENCE" },
    { field: "leanMass", value: comparisonValue(61.23, 62.14, "kg"), baselineMethod: "US_NAVY_CIRCUMFERENCE", comparisonMethod: "US_NAVY_CIRCUMFERENCE" },
  ],
};

async function renderComparisonHistory(
  sessions: Measurement[] = [newerHistoricalSession, historicalSession]
) {
  vi.mocked(getMeasurementData).mockResolvedValue({
    ...historicalMeasurementData,
    measurementSessions: sessions,
    measurements: sessions,
  });
  vi.mocked(getMeasurementComparison).mockResolvedValue(comparisonResponse);
  const user = userEvent.setup();
  render(<LocaleProvider><MemoryRouter><MeasurementsPage /></MemoryRouter></LocaleProvider>);
  const trigger = await screen.findByRole("button", { name: "Compare sessions" });
  return { user, trigger };
}

describe("Historical measurement session comparison", () => {
  it("disables comparison until at least two sessions exist", async () => {
    vi.mocked(getMeasurementData).mockResolvedValue(historicalMeasurementData);
    render(<LocaleProvider><MemoryRouter><MeasurementsPage /></MemoryRouter></LocaleProvider>);
    expect(await screen.findByRole("button", { name: "Compare sessions" })).toBeDisabled();
  });

  it("defaults to the two most recent sessions, loads from the API, and prevents identical selection", async () => {
    const { user, trigger } = await renderComparisonHistory();
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Compare measurement sessions" });
    await waitFor(() => expect(getMeasurementComparison).toHaveBeenCalledWith("session-1", "session-2"));
    const baselineSelect = within(dialog).getByRole("combobox", { name: "Baseline session" });
    const comparisonSelect = within(dialog).getByRole("combobox", { name: "Comparison session" });
    expect(baselineSelect).toHaveValue("session-1");
    expect(comparisonSelect).toHaveValue("session-2");
    expect(within(baselineSelect).getByRole("option", { name: new Date(newerHistoricalSession.measurementDate).toLocaleString("en-US") })).toBeDisabled();
    expect(within(comparisonSelect).getByRole("option", { name: new Date(historicalSession.measurementDate).toLocaleString("en-US") })).toBeDisabled();
  });

  it("requests a new backend comparison when the user changes a selection", async () => {
    const oldestSession = {
      ...historicalSession,
      id: "session-0",
      measurementDate: "2026-06-15T14:30:00.000Z",
    };
    const { user, trigger } = await renderComparisonHistory([
      newerHistoricalSession,
      historicalSession,
      oldestSession,
    ]);
    await user.click(trigger);
    const baselineSelect = within(screen.getByRole("dialog")).getByRole("combobox", { name: "Baseline session" });
    await user.selectOptions(baselineSelect, "session-0");
    await waitFor(() => expect(getMeasurementComparison).toHaveBeenLastCalledWith("session-0", "session-2"));
  });

  it("shows API loading and renders backend-provided core, paired, calculated, and unavailable results", async () => {
    let resolveComparison!: (value: MeasurementSessionComparison) => void;
    const { user, trigger } = await renderComparisonHistory();
    vi.mocked(getMeasurementComparison).mockImplementation(() => new Promise((resolve) => { resolveComparison = resolve; }));

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Compare measurement sessions" });
    expect(within(dialog).getByText("Loading comparison...")).toBeInTheDocument();
    resolveComparison(comparisonResponse);

    const table = await within(dialog).findByRole("table", { name: /Body measurement changes/ });
    expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "Neck", "Chest", "Waist", "Abdomen", "Hips",
      "Upper arms", "Forearms", "Thighs", "Calves",
      "Calculated metrics", "Body fat", "Waist-to-height", "Fat mass", "Lean mass",
    ]);
    expect(within(table).getByRole("row", { name: /Neck 38.1 cm 39.37 cm [+]1.27 cm [+]3.33 %/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Upper arms Left: 30.48 cmRight: 31.75 cm/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Chest Not recorded Not recorded Neither session recorded this measurement/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Body fat 18.5 %U.S. Navy circumference estimate 17.5 %/ })).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("shows inaccessible comparison errors returned through the mocked API boundary", async () => {
    const { user, trigger } = await renderComparisonHistory();
    vi.mocked(getMeasurementComparison).mockRejectedValue(new Error("not found"));
    await user.click(trigger);
    expect(await screen.findByRole("alert")).toHaveTextContent("One or both selected sessions are no longer available.");
  });

  it("traps focus, closes with Escape, and restores focus to the opener", async () => {
    const { user, trigger } = await renderComparisonHistory();
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Compare measurement sessions" });
    expect(within(dialog).getByRole("heading", { name: "Compare measurement sessions" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes with the explicit Close button and restores focus", async () => {
    const { user, trigger } = await renderComparisonHistory();
    await user.click(trigger);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
