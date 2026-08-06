import {
  calculateBodyComposition,
  calculateWaistToHeightRatio,
} from "../src/utils/body-composition.js";

describe("calculateBodyComposition", () => {
  it("calculates a male-reference Navy estimate", () => {
    const result = calculateBodyComposition({
      reference: "MALE",
      heightCm: 180,
      weightKg: 90,
      neckCm: 40,
      abdomenCm: 100,
    });

    expect(result).not.toBeNull();
    expect(result?.bodyFatMethod).toBe("US_NAVY_CIRCUMFERENCE");
    expect(result?.bodyFat).toBeCloseTo(25.3, 1);
    expect(result?.fatMassKg).toBeCloseTo(90 * (result?.bodyFat ?? 0) / 100, 1);
    expect((result?.fatMassKg ?? 0) + (result?.leanMassKg ?? 0)).toBeCloseTo(90, 1);
    expect(result?.waistToHeightRatio).toBeCloseTo(0.556, 3);
    expect(result?.waistToHeightRatioMethod).toBe("WAIST_CM_DIVIDED_BY_HEIGHT_CM");
  });

  it("calculates a female-reference Navy estimate", () => {
    const result = calculateBodyComposition({
      reference: "FEMALE",
      heightCm: 165,
      weightKg: 70,
      neckCm: 34,
      waistCm: 82,
      hipsCm: 104,
    });

    expect(result).not.toBeNull();
    expect(result?.bodyFatMethod).toBe("US_NAVY_CIRCUMFERENCE");
    expect(result?.bodyFat).toBeCloseTo(34.6, 1);
    expect(result?.fatMassKg).toBeCloseTo(70 * (result?.bodyFat ?? 0) / 100, 1);
    expect((result?.fatMassKg ?? 0) + (result?.leanMassKg ?? 0)).toBeCloseTo(70, 1);
    expect(result?.waistToHeightRatio).toBeCloseTo(0.497, 3);
    expect(result?.waistToHeightRatioMethod).toBe("WAIST_CM_DIVIDED_BY_HEIGHT_CM");
  });

  it("calculates waist-to-height ratio independently of body-fat inputs", () => {
    expect(calculateWaistToHeightRatio(90, 180)).toEqual({
      value: 0.5,
      method: "WAIST_CM_DIVIDED_BY_HEIGHT_CM",
    });
    expect(calculateWaistToHeightRatio(null, 180)).toBeNull();
    expect(calculateWaistToHeightRatio(90, null)).toBeNull();
  });

  it("returns null when the required reference measurements are missing", () => {
    expect(calculateBodyComposition({ reference: "MALE", heightCm: 180, neckCm: 40 })).toBeNull();
    expect(calculateBodyComposition({ reference: "FEMALE", heightCm: 165, neckCm: 34, waistCm: 82 })).toBeNull();
    expect(calculateBodyComposition({ reference: null, heightCm: 180, neckCm: 40, abdomenCm: 100 })).toBeNull();
  });
});
