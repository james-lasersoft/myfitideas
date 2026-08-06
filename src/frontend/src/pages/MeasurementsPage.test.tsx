import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LocaleProvider } from "../i18n/LocaleContext";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MeasurementsPage from "./MeasurementsPage";
import { createMeasurement, getMeasurementData } from "../services/measurementService";

vi.mock("../services/measurementService", () => ({
  createMeasurement: vi.fn(),
  getMeasurementData: vi.fn(),
  getMeasurementError: vi.fn(() => "Unable to save measurement."),
  getMeasurementGuardrail: vi.fn(() => null),
}));

vi.mock("../services/bodyWeightService", () => ({
  createBodyWeight: vi.fn(),
  getBodyWeightError: vi.fn(() => "Unable to save body weight."),
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
