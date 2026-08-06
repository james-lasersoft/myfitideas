import { calculateBodyComposition } from "../src/utils/body-composition.js";

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
    expect(result?.bodyFat).toBeGreaterThan(10);
    expect(result?.bodyFat).toBeLessThan(40);
    expect(result?.fatMassKg).toBeCloseTo(90 * (result?.bodyFat ?? 0) / 100, 1);
    expect((result?.fatMassKg ?? 0) + (result?.leanMassKg ?? 0)).toBeCloseTo(90, 1);
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
    expect(result?.bodyFat).toBeGreaterThan(15);
    expect(result?.bodyFat).toBeLessThan(50);
  });

  it("returns null when the required reference measurements are missing", () => {
    expect(calculateBodyComposition({ reference: "MALE", heightCm: 180, neckCm: 40 })).toBeNull();
    expect(calculateBodyComposition({ reference: "FEMALE", heightCm: 165, neckCm: 34, waistCm: 82 })).toBeNull();
    expect(calculateBodyComposition({ reference: null, heightCm: 180, neckCm: 40, abdomenCm: 100 })).toBeNull();
  });
});
