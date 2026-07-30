import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  getProfile,
  updateProfile,
  type UpdateProfileInput,
} from "../services/profileService";
import {
  formatMeasurementInput,
  getMeasurementStep,
} from "../utils/measurementFormat";

const POUNDS_TO_KG = 0.45359237;
const OUNCES_TO_ML = 29.5735295625;
const INCHES_TO_CM = 2.54;

function convertWeightValue(
  value: string,
  fromUnit: "lb" | "kg",
  toUnit: "lb" | "kg"
): string {
  if (value.trim() === "" || fromUnit === toUnit) return value;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  const converted =
    fromUnit === "lb"
      ? numericValue * POUNDS_TO_KG
      : numericValue / POUNDS_TO_KG;

  return formatMeasurementInput(converted, toUnit);
}

function convertHydrationValue(
  value: string,
  fromUnit: "oz" | "ml",
  toUnit: "oz" | "ml"
): string {
  if (value.trim() === "" || fromUnit === toUnit) return value;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  const converted =
    fromUnit === "oz"
      ? numericValue * OUNCES_TO_ML
      : numericValue / OUNCES_TO_ML;

  return formatMeasurementInput(converted, toUnit);
}

function convertLengthValue(
  value: string,
  fromUnit: "in" | "cm",
  toUnit: "in" | "cm"
): string {
  if (value.trim() === "" || fromUnit === toUnit) return value;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  const converted =
    fromUnit === "in"
      ? numericValue * INCHES_TO_CM
      : numericValue / INCHES_TO_CM;

  return formatMeasurementInput(converted, toUnit);
}

export default function ProfilePage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [height, setHeight] = useState("");
  const [preferredWeightUnit, setPreferredWeightUnit] =
    useState<"lb" | "kg">("lb");
  const [preferredLengthUnit, setPreferredLengthUnit] =
    useState<"in" | "cm">("in");
  const [preferredHydrationUnit, setPreferredHydrationUnit] =
    useState<"oz" | "ml">("oz");
  const [dailyHydrationGoal, setDailyHydrationGoal] = useState("64");
  const [targetWeight, setTargetWeight] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getProfile();
        const heightValue =
          profile.heightCm === null
            ? ""
            : profile.preferredLengthUnit === "cm"
              ? profile.heightCm
              : profile.heightCm / INCHES_TO_CM;

        setFirstName(profile.firstName);
        setLastName(profile.lastName ?? "");
        setPreferredWeightUnit(profile.preferredWeightUnit);
        setPreferredLengthUnit(profile.preferredLengthUnit);
        setPreferredHydrationUnit(profile.preferredHydrationUnit);
        setHeight(
          heightValue === ""
            ? ""
            : formatMeasurementInput(
                heightValue,
                profile.preferredLengthUnit
              )
        );
        setDailyHydrationGoal(
          formatMeasurementInput(
            profile.dailyHydrationGoal,
            profile.preferredHydrationUnit
          )
        );
        setTargetWeight(
          profile.targetWeight !== null
            ? formatMeasurementInput(
                profile.targetWeight,
                profile.preferredWeightUnit
              )
            : ""
        );
      } catch (loadError) {
        console.error("Load profile error:", loadError);
        setError("Unable to load your profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  function handleWeightUnitChange(nextUnit: "lb" | "kg") {
    setTargetWeight((currentValue) =>
      convertWeightValue(currentValue, preferredWeightUnit, nextUnit)
    );
    setPreferredWeightUnit(nextUnit);
  }

  function handleLengthUnitChange(nextUnit: "in" | "cm") {
    setHeight((currentValue) =>
      convertLengthValue(currentValue, preferredLengthUnit, nextUnit)
    );
    setPreferredLengthUnit(nextUnit);
  }

  function handleHydrationUnitChange(nextUnit: "oz" | "ml") {
    setDailyHydrationGoal((currentValue) =>
      convertHydrationValue(
        currentValue,
        preferredHydrationUnit,
        nextUnit
      )
    );
    setPreferredHydrationUnit(nextUnit);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    const parsedHeight =
      height.trim() === "" ? null : Number(height);
    const parsedHydrationGoal = Number(dailyHydrationGoal);
    const parsedTargetWeight =
      targetWeight.trim() === "" ? null : Number(targetWeight);

    if (parsedHeight !== null && !Number.isFinite(parsedHeight)) {
      setError("Height must be a valid number.");
      return;
    }

    const heightCm =
      parsedHeight === null
        ? null
        : preferredLengthUnit === "cm"
          ? parsedHeight
          : parsedHeight * INCHES_TO_CM;

    if (
      heightCm !== null &&
      (heightCm < 50 || heightCm > 300)
    ) {
      setError(
        preferredLengthUnit === "cm"
          ? "Height must be between 50.0 and 300.0 cm."
          : "Height must be between 19.7 and 118.1 in."
      );
      return;
    }

    if (
      !Number.isFinite(parsedHydrationGoal) ||
      parsedHydrationGoal <= 0
    ) {
      setError("Daily hydration goal must be greater than zero.");
      return;
    }

    if (
      parsedTargetWeight !== null &&
      (!Number.isFinite(parsedTargetWeight) || parsedTargetWeight <= 0)
    ) {
      setError("Target weight must be greater than zero.");
      return;
    }

    const input: UpdateProfileInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim() === "" ? null : lastName.trim(),
      heightCm,
      preferredWeightUnit,
      preferredLengthUnit,
      preferredHydrationUnit,
      dailyHydrationGoal: parsedHydrationGoal,
      targetWeight: parsedTargetWeight,
    };

    try {
      setSaving(true);

      const updatedProfile = await updateProfile(input);
      const storedUser = localStorage.getItem("currentUser");

      if (storedUser) {
        const currentUser = JSON.parse(storedUser);

        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            ...currentUser,
            firstName: updatedProfile.firstName,
            lastName: updatedProfile.lastName,
          })
        );
      }

      const updatedHeight =
        updatedProfile.heightCm === null
          ? ""
          : updatedProfile.preferredLengthUnit === "cm"
            ? updatedProfile.heightCm
            : updatedProfile.heightCm / INCHES_TO_CM;

      setPreferredWeightUnit(updatedProfile.preferredWeightUnit);
      setPreferredLengthUnit(updatedProfile.preferredLengthUnit);
      setPreferredHydrationUnit(updatedProfile.preferredHydrationUnit);
      setHeight(
        updatedHeight === ""
          ? ""
          : formatMeasurementInput(
              updatedHeight,
              updatedProfile.preferredLengthUnit
            )
      );
      setDailyHydrationGoal(
        formatMeasurementInput(
          updatedProfile.dailyHydrationGoal,
          updatedProfile.preferredHydrationUnit
        )
      );
      setTargetWeight(
        updatedProfile.targetWeight !== null
          ? formatMeasurementInput(
              updatedProfile.targetWeight,
              updatedProfile.preferredWeightUnit
            )
          : ""
      );
      setMessage("Profile updated successfully.");
    } catch (saveError) {
      console.error("Save profile error:", saveError);
      setError("Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="profile-page">
        <p>Loading profile...</p>
      </main>
    );
  }

  const heightMin = preferredLengthUnit === "cm" ? "50" : "19.7";
  const heightMax = preferredLengthUnit === "cm" ? "300" : "118.1";
  const heightPlaceholder =
    preferredLengthUnit === "cm" ? "Example: 187.0" : "Example: 73.6";

  return (
    <main className="profile-page">
      <section className="profile-card">
        <div className="profile-header">
          <div>
            <h1>My Profile</h1>
            <p>Manage your personal details, goals, and preferred units.</p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              First Name
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </label>

            <label>
              Last Name
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </label>

            <label>
              Height
              <div className="input-with-unit">
                <input
                  type="number"
                  min={heightMin}
                  max={heightMax}
                  step={getMeasurementStep(preferredLengthUnit)}
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  placeholder={heightPlaceholder}
                />
                <span>{preferredLengthUnit}</span>
              </div>
            </label>

            <label>
              Target Weight
              <div className="input-with-unit">
                <input
                  type="number"
                  min="1"
                  step={getMeasurementStep(preferredWeightUnit)}
                  value={targetWeight}
                  onChange={(event) => setTargetWeight(event.target.value)}
                  placeholder="Optional"
                />
                <span>{preferredWeightUnit}</span>
              </div>
            </label>

            <label>
              Preferred Weight Unit
              <select
                value={preferredWeightUnit}
                onChange={(event) =>
                  handleWeightUnitChange(
                    event.target.value as "lb" | "kg"
                  )
                }
              >
                <option value="lb">Pounds (lb)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </label>

            <label>
              Preferred Length Unit
              <select
                value={preferredLengthUnit}
                onChange={(event) =>
                  handleLengthUnitChange(
                    event.target.value as "in" | "cm"
                  )
                }
              >
                <option value="in">Inches (in)</option>
                <option value="cm">Centimeters (cm)</option>
              </select>
            </label>

            <label>
              Preferred Hydration Unit
              <select
                value={preferredHydrationUnit}
                onChange={(event) =>
                  handleHydrationUnitChange(
                    event.target.value as "oz" | "ml"
                  )
                }
              >
                <option value="oz">Ounces (oz)</option>
                <option value="ml">Milliliters (ml)</option>
              </select>
            </label>

            <label>
              Daily Hydration Goal
              <div className="input-with-unit">
                <input
                  type="number"
                  min={preferredHydrationUnit === "ml" ? "1" : "0.1"}
                  step={getMeasurementStep(preferredHydrationUnit)}
                  value={dailyHydrationGoal}
                  onChange={(event) =>
                    setDailyHydrationGoal(event.target.value)
                  }
                  required
                />
                <span>{preferredHydrationUnit}</span>
              </div>
            </label>
          </div>

          {error && (
            <p className="form-message error-message">{error}</p>
          )}

          {message && (
            <p className="form-message success-message">{message}</p>
          )}

          <div className="profile-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
