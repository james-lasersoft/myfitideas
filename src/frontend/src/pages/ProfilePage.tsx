import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  getProfile,
  updateProfile,
  type PreferredDateFormat,
  type PreferredTimeFormat,
  type PreferredWeekStart,
  type UpdateProfileInput,
} from "../services/profileService";
import {
  formatMeasurementInput,
  getMeasurementStep,
} from "../utils/measurementFormat";
import "./ProfilePage.css";

const POUNDS_TO_KG = 0.45359237;
const OUNCES_TO_ML = 29.5735295625;
const INCHES_TO_CM = 2.54;

const TIMEZONE_OPTIONS = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Sao_Paulo",
  "Europe/Lisbon",
  "UTC",
] as const;

function convertWeightValue(value: string, fromUnit: "lb" | "kg", toUnit: "lb" | "kg"): string {
  if (value.trim() === "" || fromUnit === toUnit) return value;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  return formatMeasurementInput(fromUnit === "lb" ? numericValue * POUNDS_TO_KG : numericValue / POUNDS_TO_KG, toUnit);
}

function convertHydrationValue(value: string, fromUnit: "oz" | "ml", toUnit: "oz" | "ml"): string {
  if (value.trim() === "" || fromUnit === toUnit) return value;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  return formatMeasurementInput(fromUnit === "oz" ? numericValue * OUNCES_TO_ML : numericValue / OUNCES_TO_ML, toUnit);
}

function convertLengthValue(value: string, fromUnit: "in" | "cm", toUnit: "in" | "cm"): string {
  if (value.trim() === "" || fromUnit === toUnit) return value;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  return formatMeasurementInput(fromUnit === "in" ? numericValue * INCHES_TO_CM : numericValue / INCHES_TO_CM, toUnit);
}

interface UnitToggleProps<T extends string> {
  label: string;
  value: T;
  options: readonly [T, T];
  onChange: (value: T) => void;
}

function UnitToggle<T extends string>({ label, value, options, onChange }: UnitToggleProps<T>) {
  return (
    <div className="unit-preference-row">
      <span className="unit-preference-label">{label}</span>
      <div className="unit-toggle" role="group" aria-label={label}>
        {options.map((option) => (
          <button key={option} type="button" className={value === option ? "unit-toggle-option active" : "unit-toggle-option"} aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>
        ))}
      </div>
    </div>
  );
}

function FutureFeature({ title, description, actionLabel, danger = false }: { title: string; description: string; actionLabel: string; danger?: boolean }) {
  return (
    <div className="future-feature-row">
      <div><strong>{title}</strong><p>{description}</p></div>
      <button type="button" className={danger ? "future-action danger" : "future-action"} disabled title="Planned for a future release">{actionLabel}</button>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [height, setHeight] = useState("");
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<"lb" | "kg">("lb");
  const [preferredLengthUnit, setPreferredLengthUnit] = useState<"in" | "cm">("in");
  const [preferredHydrationUnit, setPreferredHydrationUnit] = useState<"oz" | "ml">("oz");
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "pt-BR">("en");
  const [preferredDateFormat, setPreferredDateFormat] = useState<PreferredDateFormat>("LOCALE");
  const [preferredTimeFormat, setPreferredTimeFormat] = useState<PreferredTimeFormat>("12");
  const [preferredWeekStart, setPreferredWeekStart] = useState<PreferredWeekStart>("SUNDAY");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [dailyHydrationGoal, setDailyHydrationGoal] = useState("64");
  const [targetWeight, setTargetWeight] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const initials = useMemo(() => `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || "U", [firstName, lastName]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getProfile();
        const heightValue = profile.heightCm === null ? "" : profile.preferredLengthUnit === "cm" ? profile.heightCm : profile.heightCm / INCHES_TO_CM;
        setEmail(profile.email);
        setFirstName(profile.firstName);
        setLastName(profile.lastName ?? "");
        setPreferredWeightUnit(profile.preferredWeightUnit);
        setPreferredLengthUnit(profile.preferredLengthUnit);
        setPreferredHydrationUnit(profile.preferredHydrationUnit);
        setPreferredLanguage(profile.preferredLanguage);
        setPreferredDateFormat(profile.preferredDateFormat);
        setPreferredTimeFormat(profile.preferredTimeFormat);
        setPreferredWeekStart(profile.preferredWeekStart);
        setTimezone(profile.timezone);
        setHeight(heightValue === "" ? "" : formatMeasurementInput(heightValue, profile.preferredLengthUnit));
        setDailyHydrationGoal(formatMeasurementInput(profile.dailyHydrationGoal, profile.preferredHydrationUnit));
        setTargetWeight(profile.targetWeight !== null ? formatMeasurementInput(profile.targetWeight, profile.preferredWeightUnit) : "");
      } catch (loadError) {
        console.error("Load profile error:", loadError);
        setError("Unable to load your profile.");
      } finally { setLoading(false); }
    }
    void loadProfile();
  }, []);

  function handleWeightUnitChange(nextUnit: "lb" | "kg") { setTargetWeight((currentValue) => convertWeightValue(currentValue, preferredWeightUnit, nextUnit)); setPreferredWeightUnit(nextUnit); }
  function handleLengthUnitChange(nextUnit: "in" | "cm") { setHeight((currentValue) => convertLengthValue(currentValue, preferredLengthUnit, nextUnit)); setPreferredLengthUnit(nextUnit); }
  function handleHydrationUnitChange(nextUnit: "oz" | "ml") { setDailyHydrationGoal((currentValue) => convertHydrationValue(currentValue, preferredHydrationUnit, nextUnit)); setPreferredHydrationUnit(nextUnit); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!firstName.trim()) { setError("First name is required."); return; }
    const parsedHeight = height.trim() === "" ? null : Number(height);
    const parsedHydrationGoal = Number(dailyHydrationGoal);
    const parsedTargetWeight = targetWeight.trim() === "" ? null : Number(targetWeight);
    if (parsedHeight !== null && !Number.isFinite(parsedHeight)) { setError("Height must be a valid number."); return; }
    const heightCm = parsedHeight === null ? null : preferredLengthUnit === "cm" ? parsedHeight : parsedHeight * INCHES_TO_CM;
    if (heightCm !== null && (heightCm < 50 || heightCm > 300)) { setError(preferredLengthUnit === "cm" ? "Height must be between 50.0 and 300.0 cm." : "Height must be between 19.7 and 118.1 in."); return; }
    if (!Number.isFinite(parsedHydrationGoal) || parsedHydrationGoal <= 0) { setError("Daily hydration goal must be greater than zero."); return; }
    if (parsedTargetWeight !== null && (!Number.isFinite(parsedTargetWeight) || parsedTargetWeight <= 0)) { setError("Target weight must be greater than zero."); return; }

    const input: UpdateProfileInput = { firstName: firstName.trim(), lastName: lastName.trim() === "" ? null : lastName.trim(), heightCm, preferredWeightUnit, preferredLengthUnit, preferredHydrationUnit, preferredLanguage, preferredDateFormat, preferredTimeFormat, preferredWeekStart, timezone, dailyHydrationGoal: parsedHydrationGoal, targetWeight: parsedTargetWeight };
    try {
      setSaving(true);
      const updatedProfile = await updateProfile(input);
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const currentUser = JSON.parse(storedUser);
        localStorage.setItem("currentUser", JSON.stringify({ ...currentUser, firstName: updatedProfile.firstName, lastName: updatedProfile.lastName, preferredDateFormat: updatedProfile.preferredDateFormat, preferredTimeFormat: updatedProfile.preferredTimeFormat, preferredWeekStart: updatedProfile.preferredWeekStart, timezone: updatedProfile.timezone }));
      }
      const updatedHeight = updatedProfile.heightCm === null ? "" : updatedProfile.preferredLengthUnit === "cm" ? updatedProfile.heightCm : updatedProfile.heightCm / INCHES_TO_CM;
      setEmail(updatedProfile.email); setPreferredWeightUnit(updatedProfile.preferredWeightUnit); setPreferredLengthUnit(updatedProfile.preferredLengthUnit); setPreferredHydrationUnit(updatedProfile.preferredHydrationUnit); setPreferredLanguage(updatedProfile.preferredLanguage); setPreferredDateFormat(updatedProfile.preferredDateFormat); setPreferredTimeFormat(updatedProfile.preferredTimeFormat); setPreferredWeekStart(updatedProfile.preferredWeekStart); setTimezone(updatedProfile.timezone);
      setHeight(updatedHeight === "" ? "" : formatMeasurementInput(updatedHeight, updatedProfile.preferredLengthUnit));
      setDailyHydrationGoal(formatMeasurementInput(updatedProfile.dailyHydrationGoal, updatedProfile.preferredHydrationUnit));
      setTargetWeight(updatedProfile.targetWeight !== null ? formatMeasurementInput(updatedProfile.targetWeight, updatedProfile.preferredWeightUnit) : "");
      setMessage("Profile updated successfully.");
    } catch (saveError) { console.error("Save profile error:", saveError); setError("Unable to update your profile."); } finally { setSaving(false); }
  }

  if (loading) return <main className="profile-page"><p>Loading profile...</p></main>;
  const heightMin = preferredLengthUnit === "cm" ? "50" : "19.7";
  const heightMax = preferredLengthUnit === "cm" ? "300" : "118.1";
  const heightPlaceholder = preferredLengthUnit === "cm" ? "Example: 187.0" : "Example: 73.6";

  return (
    <main className="profile-page">
      <section className="profile-card">
        <div className="profile-header">
          <div className="profile-identity"><div className="profile-avatar" aria-hidden="true">{initials}</div><div><h1>My Profile</h1><p>Manage your personal details, goals, and preferences.</p></div></div>
          <button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <section className="profile-section" aria-labelledby="personal-information-heading">
            <h2 id="personal-information-heading">Personal Information</h2>
            <div className="profile-personal-grid">
              <label>First Name<input type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
              <label>Last Name<input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
              <label className="profile-email-field">Email Address<input type="email" value={email} readOnly aria-readonly="true" /><small>Email changes will be available in a future release.</small></label>
              <div className="profile-inline-future"><span>Password</span><button type="button" className="future-action" disabled>Change Password</button><small>Secure password management is planned.</small></div>
              <div className="profile-inline-future"><span>Account Security</span><button type="button" className="future-action" onClick={() => navigate("/profile/security")}>Open Security Center</button><small>Manage MFA, trusted devices, and account access.</small></div>
            </div>
          </section>

          <div className="profile-preferences-layout">
            <section className="profile-section preference-column" aria-labelledby="measurement-preferences-heading">
              <h2 id="measurement-preferences-heading">Measurement Preferences</h2>
              <p className="profile-section-description">Click a unit to update the related values immediately.</p>
              <div className="unit-preference-list"><UnitToggle label="Weight" value={preferredWeightUnit} options={["lb", "kg"]} onChange={handleWeightUnitChange} /><UnitToggle label="Length" value={preferredLengthUnit} options={["in", "cm"]} onChange={handleLengthUnitChange} /><UnitToggle label="Hydration" value={preferredHydrationUnit} options={["oz", "ml"]} onChange={handleHydrationUnitChange} /></div>
            </section>
            <section className="profile-section values-column" aria-labelledby="goals-measurements-heading">
              <h2 id="goals-measurements-heading">Goals &amp; Measurements</h2>
              <div className="profile-values-list">
                <label>Height<div className="input-with-unit"><input type="number" min={heightMin} max={heightMax} step={getMeasurementStep(preferredLengthUnit)} value={height} onChange={(event) => setHeight(event.target.value)} placeholder={heightPlaceholder} /><span>{preferredLengthUnit}</span></div></label>
                <label>Target Weight<div className="input-with-unit"><input type="number" min="1" step={getMeasurementStep(preferredWeightUnit)} value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} placeholder="Optional" /><span>{preferredWeightUnit}</span></div></label>
                <label>Daily Hydration Goal<div className="input-with-unit"><input type="number" min={preferredHydrationUnit === "ml" ? "1" : "0.1"} step={getMeasurementStep(preferredHydrationUnit)} value={dailyHydrationGoal} onChange={(event) => setDailyHydrationGoal(event.target.value)} required /><span>{preferredHydrationUnit}</span></div></label>
              </div>
            </section>
          </div>

          <section className="profile-section" aria-labelledby="localization-heading">
            <h2 id="localization-heading">Localization</h2>
            <p className="profile-section-description">Language is selected with the flag controls. These settings customize dates, times, and calendars independently.</p>
            <div className="profile-localization-grid">
              <label>Date Format<select value={preferredDateFormat} onChange={(event) => setPreferredDateFormat(event.target.value as PreferredDateFormat)}><option value="LOCALE">Locale standard</option><option value="MM_DD_YYYY">MM/DD/YYYY</option><option value="DD_MM_YYYY">DD/MM/YYYY</option><option value="YYYY_MM_DD">YYYY-MM-DD</option></select></label>
              <div className="localization-toggle-field"><span>Time Format</span><div className="unit-toggle" role="group" aria-label="Time Format"><button type="button" className={preferredTimeFormat === "12" ? "unit-toggle-option active" : "unit-toggle-option"} aria-pressed={preferredTimeFormat === "12"} onClick={() => setPreferredTimeFormat("12")}>12 hr</button><button type="button" className={preferredTimeFormat === "24" ? "unit-toggle-option active" : "unit-toggle-option"} aria-pressed={preferredTimeFormat === "24"} onClick={() => setPreferredTimeFormat("24")}>24 hr</button></div></div>
              <label>First Day of Week<select value={preferredWeekStart} onChange={(event) => setPreferredWeekStart(event.target.value as PreferredWeekStart)}><option value="SUNDAY">Sunday</option><option value="MONDAY">Monday</option></select></label>
              <label>Time Zone<select value={timezone} onChange={(event) => setTimezone(event.target.value)}>{!TIMEZONE_OPTIONS.includes(timezone as (typeof TIMEZONE_OPTIONS)[number]) && <option value={timezone}>{timezone}</option>}{TIMEZONE_OPTIONS.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>
            </div>
          </section>

          <section className="profile-section staged-section" aria-labelledby="future-settings-heading">
            <div className="section-heading-row"><div><h2 id="future-settings-heading">Future Settings</h2><p className="profile-section-description">These areas are staged in the profile layout and will be activated as their features are built.</p></div><span className="planned-badge">Planned</span></div>
            <div className="future-feature-list">
              <FutureFeature title="Notifications" description="Hydration, weigh-in, and weekly progress reminders." actionLabel="Manage" />
              <FutureFeature title="Subscription" description="View the current plan and manage premium features." actionLabel="View Plan" />
              <FutureFeature title="Export My Data" description="Download a portable copy of profile and tracking data." actionLabel="Export" />
              <FutureFeature title="Delete Account" description="Permanently remove the account and associated data." actionLabel="Delete" danger />
            </div>
          </section>

          {error && <p className="form-message error-message">{error}</p>}
          {message && <p className="form-message success-message">{message}</p>}
          <div className="profile-actions"><button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button></div>
        </form>
      </section>
    </main>
  );
}
