import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import {
  createMeasurement,
  getMeasurementError,
  getMeasurementGuardrail,
  getMeasurements,
  type CreateMeasurementInput,
  type LengthUnit,
  type Measurement,
  type MeasurementDisplayUnits,
  type WeightUnit,
} from "../services/measurementService";
import { getProfile } from "../services/profileService";
import { formatMeasurement, getMeasurementStep } from "../utils/measurementFormat";

const DEFAULT_DISPLAY_UNITS: MeasurementDisplayUnits = { weight: "lb", length: "in" };

function getLocalDateValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function rangeForWeight(unit: WeightUnit) {
  return unit === "kg" ? { min: 25, max: 450 } : { min: 55, max: 992 };
}

function rangeForLength(unit: LengthUnit) {
  return unit === "cm" ? { min: 30, max: 300 } : { min: 12, max: 118 };
}

export default function MeasurementsPage() {
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [displayUnits, setDisplayUnits] = useState<MeasurementDisplayUnits>(DEFAULT_DISPLAY_UNITS);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [hips, setHips] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [measurementDate, setMeasurementDate] = useState(getLocalDateValue());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refreshMeasurements = async (): Promise<void> => setMeasurements(await getMeasurements());

  useEffect(() => {
    let isCancelled = false;
    Promise.all([getMeasurements(), getProfile()])
      .then(([records, profile]) => {
        if (isCancelled) return;
        setMeasurements(records);
        setDisplayUnits({ weight: profile.preferredWeightUnit, length: profile.preferredLengthUnit });
      })
      .catch(() => { if (!isCancelled) setError("Unable to load measurements."); })
      .finally(() => { if (!isCancelled) setIsLoading(false); });
    return () => { isCancelled = true; };
  }, []);

  const optionalNumber = (value: string): number | undefined => value.trim() === "" ? undefined : Number(value);

  const clearForm = (): void => {
    setWeight(""); setWaist(""); setChest(""); setHips(""); setBodyFat("");
    setMeasurementDate(getLocalDateValue());
  };

  const submitMeasurement = async (input: CreateMeasurementInput): Promise<void> => {
    try {
      await createMeasurement(input);
    } catch (caught) {
      const guardrail = getMeasurementGuardrail(caught);
      if (!guardrail) throw caught;
      const details = guardrail.issues.map((issue) => {
        const elapsed = issue.elapsedDays ? ` over ${Math.round(issue.elapsedDays)} day(s)` : "";
        return `${issue.field}: ${issue.message}${elapsed}`;
      }).join("\n");
      const confirmed = window.confirm(`${guardrail.message}\n\n${details}\n\nSave this entry as confirmed?`);
      if (!confirmed) throw new Error("ENTRY_REVIEW_REQUESTED", { cause: caught });
      await createMeasurement({ ...input, confirmAnomaly: true });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setMessage(""); setError("");
    const weightRange = rangeForWeight(displayUnits.weight);
    const lengthRange = rangeForLength(displayUnits.length);
    const input: CreateMeasurementInput = {
      weight: optionalNumber(weight), waist: optionalNumber(waist), chest: optionalNumber(chest), hips: optionalNumber(hips), bodyFat: optionalNumber(bodyFat),
      weightUnit: displayUnits.weight, lengthUnit: displayUnits.length,
      measurementDate: new Date(`${measurementDate}T12:00:00`).toISOString(),
    };

    const fieldChecks: Array<[string, number | undefined, number, number]> = [
      ["Weight", input.weight, weightRange.min, weightRange.max],
      ["Waist", input.waist, lengthRange.min, lengthRange.max],
      ["Chest", input.chest, lengthRange.min, lengthRange.max],
      ["Hips", input.hips, lengthRange.min, lengthRange.max],
      ["Body Fat", input.bodyFat, 2, 75],
    ];
    const invalid = fieldChecks.find(([, value, min, max]) => value !== undefined && (!Number.isFinite(value) || value < min || value > max));
    if (invalid) {
      setError(`${invalid[0]} must be between ${invalid[2]} and ${invalid[3]}.`);
      return;
    }
    if (fieldChecks.every(([, value]) => value === undefined)) {
      setError("Enter at least one measurement value.");
      return;
    }

    setIsSaving(true);
    try {
      await submitMeasurement(input);
      clearForm();
      setMessage("Measurement saved successfully.");
      await refreshMeasurements();
    } catch (caught) {
      if (caught instanceof Error && caught.message === "ENTRY_REVIEW_REQUESTED") setError("Measurement was not saved. Review the value and unit.");
      else setError(getMeasurementError(caught));
    } finally {
      setIsSaving(false);
    }
  };

  const formatOptional = (value: number | null, unit: WeightUnit | LengthUnit | "%"): string => value === null ? "-" : `${formatMeasurement(value, unit)} ${unit}`;
  const weightRange = rangeForWeight(displayUnits.weight);
  const lengthRange = rangeForLength(displayUnits.length);

  return (
    <main className="dashboard-page measurements-page">
      <header className="dashboard-header page-brand-header">
        <div className="page-brand-heading"><BrandLogo variant="symbol" className="page-brand-symbol" /><div><h1>Body Measurements</h1><p>Record and review your progress.</p></div></div>
        <button className="secondary-button" type="button" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
      </header>

      <section className="measurement-layout">
        <article className="dashboard-card">
          <h2>Add Measurement</h2>
          <p>Entries use your profile preferences: {displayUnits.weight} for weight and {displayUnits.length} for body measurements.</p>
          <p>Body measurements are evaluated across the elapsed weeks since the nearest previous entry.</p>
          <form className="measurement-form" onSubmit={handleSubmit}>
            <label>Measurement Date<input type="date" max={getLocalDateValue()} value={measurementDate} onChange={(event) => setMeasurementDate(event.target.value)} required /></label>
            <label>Weight ({displayUnits.weight})<input type="number" step={getMeasurementStep(displayUnits.weight)} min={weightRange.min} max={weightRange.max} value={weight} onChange={(event) => setWeight(event.target.value)} /></label>
            <label>Waist ({displayUnits.length})<input type="number" step={getMeasurementStep(displayUnits.length)} min={lengthRange.min} max={lengthRange.max} value={waist} onChange={(event) => setWaist(event.target.value)} /></label>
            <label>Chest ({displayUnits.length})<input type="number" step={getMeasurementStep(displayUnits.length)} min={lengthRange.min} max={lengthRange.max} value={chest} onChange={(event) => setChest(event.target.value)} /></label>
            <label>Hips ({displayUnits.length})<input type="number" step={getMeasurementStep(displayUnits.length)} min={lengthRange.min} max={lengthRange.max} value={hips} onChange={(event) => setHips(event.target.value)} /></label>
            <label>Body Fat (%)<input type="number" step={getMeasurementStep("%")} min="2" max="75" value={bodyFat} onChange={(event) => setBodyFat(event.target.value)} /></label>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
            <button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Measurement"}</button>
          </form>
        </article>

        <article className="dashboard-card">
          <h2>Measurement History</h2>
          {isLoading ? <p>Loading measurements...</p> : measurements.length === 0 ? <p>No measurements have been recorded yet.</p> : (
            <div className="measurement-history">{measurements.map((measurement) => {
              const units = measurement.displayUnits ?? displayUnits;
              return <article key={measurement.id} className="history-item"><strong>{new Date(measurement.measurementDate).toLocaleDateString()}</strong><p>Weight: {formatOptional(measurement.weight, units.weight)}</p><p>Waist: {formatOptional(measurement.waist, units.length)}</p><p>Chest: {formatOptional(measurement.chest, units.length)}</p><p>Hips: {formatOptional(measurement.hips, units.length)}</p><p>Body Fat: {formatOptional(measurement.bodyFat, "%")}</p></article>;
            })}</div>
          )}
        </article>
      </section>
    </main>
  );
}
