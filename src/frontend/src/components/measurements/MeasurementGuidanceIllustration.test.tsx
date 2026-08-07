import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LocaleProvider } from "../../i18n/LocaleContext";
import MeasurementGuidanceIllustration from "./MeasurementGuidanceIllustration";
import {
  getMeasurementIllustrationAsset,
  MEASUREMENT_DEFINITIONS,
  NOVICE_STEPS,
  type MeasurementIllustrationMetadata,
} from "./measurementSessionModel";

beforeEach(() => {
  localStorage.setItem("myfitideas.locale", "en-US");
});

describe("MeasurementGuidanceIllustration", () => {
  it("renders the mapped asset with localized informative alt text", () => {
    render(<LocaleProvider>
      <MeasurementGuidanceIllustration illustration={MEASUREMENT_DEFINITIONS.neck.illustration} />
    </LocaleProvider>);

    const image = screen.getByRole("img", { name: "Illustration showing tape placement around the neck." });
    expect(image).toHaveAttribute("src", expect.stringMatching(/data-measurement-concept=.*neck/));
    expect(image).not.toHaveAttribute("tabindex");
  });

  it("uses the Brazilian Portuguese alt translation", () => {
    localStorage.setItem("myfitideas.locale", "pt-BR");
    render(<LocaleProvider>
      <MeasurementGuidanceIllustration illustration={MEASUREMENT_DEFINITIONS.chest.illustration} />
    </LocaleProvider>);

    expect(screen.getByRole("img", {
      name: "Ilustração mostrando a posição da fita ao redor do peitoral.",
    })).toBeInTheDocument();
  });

  it("keeps a stable silent fallback when an asset fails to load", () => {
    const missing: MeasurementIllustrationMetadata = {
      asset: "/missing-guidance.svg",
      altTextSource: "Illustration showing tape placement around the neck.",
      shortInstructionSource: "Place the tape below the larynx, level and snug without compressing the skin.",
    };
    const { container } = render(<LocaleProvider>
      <MeasurementGuidanceIllustration illustration={missing} />
    </LocaleProvider>);

    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const region = container.querySelector(".measurement-guidance-illustration");
    expect(region).toHaveAttribute("data-illustration-status", "unavailable");
    expect(region?.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("supports an explicitly decorative image without an accessible announcement", () => {
    const { container } = render(<LocaleProvider>
      <MeasurementGuidanceIllustration
        illustration={MEASUREMENT_DEFINITIONS.waist.illustration}
        decorative
      />
    </LocaleProvider>);

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("aria-hidden", "true");
  });
});

describe("measurement guidance metadata", () => {
  it("maps every Guided step to its stable concept asset", () => {
    expect(NOVICE_STEPS.map(({ illustration }) => {
      const match = decodeURIComponent(illustration.asset)
        .match(/data-measurement-concept='([^']+)'/);
      return match?.[1];
    })).toEqual([
      "neck", "chest", "waist", "abdomen", "hips",
      "upper-arm", "forearm", "thigh", "calf",
    ]);
  });

  it("reuses conceptual assets for both sides and supports optional side overrides", () => {
    for (const [left, right] of [
      ["leftBicep", "rightBicep"],
      ["leftForearm", "rightForearm"],
      ["leftThigh", "rightThigh"],
      ["leftCalf", "rightCalf"],
    ] as const) {
      expect(MEASUREMENT_DEFINITIONS[left].illustration)
        .toBe(MEASUREMENT_DEFINITIONS[right].illustration);
    }

    const illustration: MeasurementIllustrationMetadata = {
      ...MEASUREMENT_DEFINITIONS.leftBicep.illustration,
      sideAssets: { right: "/right-upper-arm.svg" },
    };
    expect(getMeasurementIllustrationAsset(illustration, "left"))
      .toBe(illustration.asset);
    expect(getMeasurementIllustrationAsset(illustration, "right"))
      .toBe("/right-upper-arm.svg");
  });
});
