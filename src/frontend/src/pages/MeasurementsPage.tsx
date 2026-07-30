import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  createMeasurement,
  getMeasurements,
  type CreateMeasurementInput,
  type LengthUnit,
  type Measurement,
  type MeasurementDisplayUnits,
  type WeightUnit,
} from "../services/measurementService";
import { getProfile } from "../services/profileService";
import {
  formatMeasurement,
  getMeasurementStep,
} from "../utils/measurementFormat";

const DEFAULT_DISPLAY_UNITS: MeasurementDisplayUnits = {
  weight: "lb",
  length: "in",
};

export default function MeasurementsPage() {
  const navigate = useNavigate();

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [displayUnits, setDisplayUnits] =
    useState<MeasurementDisplayUnits>(DEFAULT_DISPLAY_UNITS);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [hips, setHips] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refreshMeasurements = async (): Promise<void> => {
    const records = await getMeasurements();
    setMeasurements(records);
  };

  useEffect(() => {
    let isCancelled = false;

    Promise.all([getMeasurements(), getProfile()])
      .then(([records, profile]) => {
        if (isCancelled) return;

        setMeasurements(records);
        setDisplayUnits({
          weight: profile.preferredWeightUnit,
          length: profile.preferredLengthUnit,
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Unable to load measurements.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const optionalNumber = (value: string): number | undefined => {
    const trimmedValue = value.trim();
    return trimmedValue === "" ? undefined : Number(trimmedValue);
  };

  const clearForm = (): void => {
    setWeight("");
    setWaist("");
    setChest("");
    setHips("");
    setBodyFat("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    setMessage("");
    setError("");
    setIsSaving(true);

    const input: CreateMeasurementInput = {
      weight: optionalNumber(weight),
      waist: optionalNumber(waist),
      chest: optionalNumber(chest),
      hips: optionalNumber(hips),
      bodyFat: optionalNumber(bodyFat),
      weightUnit: displayUnits.weight,
      lengthUnit: displayUnits.length,
    };

    try {
      await createMeasurement(input);
      clearForm();
      setMessage("Measurement saved successfully.");
      await refreshMeasurements();
    } catch {
      setError("Unable to save measurement.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatOptional = (
    value: number | null,
    unit: WeightUnit | LengthUnit | "%"
  ): string => {
    return value === null
      ? "-"
      : `${formatMeasurement(value, unit)} ${unit}`;
  };

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Body Measurements</h1>
          <p>Record and review your progress.</p>
        </div>

        <button type="button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      <section className="measurement-layout">
        <article className="dashboard-card">
          <h2>Add Measurement</h2>
          <p>
            Entries use your profile preferences: {displayUnits.weight} for
            weight and {displayUnits.length} for body measurements.
          </p>

          <form className="measurement-form" onSubmit={handleSubmit}>
            <label>
              Weight ({displayUnits.weight})
              <input
                type="number"
                step={getMeasurementStep(displayUnits.weight)}
                min="0"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
            </label>

            <label>
              Waist ({displayUnits.length})
              <input
                type="number"
                step={getMeasurementStep(displayUnits.length)}
                min="0"
                value={waist}
                onChange={(event) => setWaist(event.target.value)}
              />
            </label>

            <label>
              Chest ({displayUnits.length})
              <input
                type="number"
                step={getMeasurementStep(displayUnits.length)}
                min="0"
                value={chest}
                onChange={(event) => setChest(event.target.value)}
              />
            </label>

            <label>
              Hips ({displayUnits.length})
              <input
                type="number"
                step={getMeasurementStep(displayUnits.length)}
                min="0"
                value={hips}
                onChange={(event) => setHips(event.target.value)}
              />
            </label>

            <label>
              Body Fat (%)
              <input
                type="number"
                step={getMeasurementStep("%")}
                min="0"
                max="100"
                value={bodyFat}
                onChange={(event) => setBodyFat(event.target.value)}
              />
            </label>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}

            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Measurement"}
            </button>
          </form>
        </article>

        <article className="dashboard-card">
          <h2>Measurement History</h2>

          {isLoading ? (
            <p>Loading measurements...</p>
          ) : measurements.length === 0 ? (
            <p>No measurements have been recorded yet.</p>
          ) : (
            <div className="measurement-history">
              {measurements.map((measurement) => {
                const units = measurement.displayUnits ?? displayUnits;

                return (
                  <article key={measurement.id} className="history-item">
                    <strong>
                      {new Date(
                        measurement.measurementDate
                      ).toLocaleDateString()}
                    </strong>
                    <p>
                      Weight: {formatOptional(measurement.weight, units.weight)}
                    </p>
                    <p>
                      Waist: {formatOptional(measurement.waist, units.length)}
                    </p>
                    <p>
                      Chest: {formatOptional(measurement.chest, units.length)}
                    </p>
                    <p>
                      Hips: {formatOptional(measurement.hips, units.length)}
                    </p>
                    <p>
                      Body Fat: {formatOptional(measurement.bodyFat, "%")}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
