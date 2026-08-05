import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminPageHeader } from "../components/admin/AdminComponents";
import { useLocale } from "../i18n/LocaleContext";
import "./Admin.css";
import "./AdminConsoleTheme.css";
import "./SyntheticDataPage.css";

type PeriodDays = 30 | 60 | 90;
type BodyProfile = "UNDERWEIGHT" | "NORMAL" | "OVERWEIGHT" | "OBESITY" | "ATHLETIC";
type SexReference = "MALE" | "FEMALE";
type Trend = "STABLE" | "LOSS" | "GAIN" | "RECOMPOSITION" | "IRREGULAR";

export default function SyntheticDataPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);
  const [age, setAge] = useState(35);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>("NORMAL");
  const [sexReference, setSexReference] = useState<SexReference>("MALE");
  const [trend, setTrend] = useState<Trend>("STABLE");
  const [dailyWeight, setDailyWeight] = useState(true);
  const [weeklyMeasurements, setWeeklyMeasurements] = useState(true);
  const [dailyHydration, setDailyHydration] = useState(true);

  const preview = useMemo(() => ({
    weightEntries: dailyWeight ? periodDays : 0,
    measurementEntries: weeklyMeasurements ? Math.ceil(periodDays / 7) : 0,
    hydrationEntries: dailyHydration ? periodDays * 4 : 0,
  }), [dailyHydration, dailyWeight, periodDays, weeklyMeasurements]);

  return (
    <main className="admin-page admin-console-page synthetic-data-page">
      <AdminPageHeader
        eyebrow={t("Super administrator tools")}
        title={t("Synthetic Test Data")}
        description={t("Create realistic development-only history for an existing test user. Generated records will be identifiable and removable as one batch.")}
        backLabel={t("Back to Admin Center")}
        onBack={() => navigate("/admin")}
      />

      <section className="synthetic-data-layout">
        <article className="synthetic-data-panel">
          <div className="synthetic-data-warning">
            <strong>{t("Development environment only")}</strong>
            <span>{t("Generation will be blocked unless the backend is running in development mode and synthetic data generation is explicitly enabled.")}</span>
          </div>

          <div className="synthetic-data-grid">
            <label>
              <span>{t("Test user")}</span>
              <select disabled value="">
                <option value="">{t("User selection will load from the Super Admin API")}</option>
              </select>
            </label>

            <fieldset>
              <legend>{t("Simulation period")}</legend>
              <div className="segmented-control">
                {[30, 60, 90].map((days) => (
                  <button key={days} type="button" className={periodDays === days ? "is-selected" : ""} onClick={() => setPeriodDays(days as PeriodDays)}>
                    {t(`${days} days`)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>{t("Generate data")}</legend>
              <label className="checkbox-row"><input type="checkbox" checked={dailyWeight} onChange={(event) => setDailyWeight(event.target.checked)} /> {t("Daily weight")}</label>
              <label className="checkbox-row"><input type="checkbox" checked={weeklyMeasurements} onChange={(event) => setWeeklyMeasurements(event.target.checked)} /> {t("Weekly body measurements")}</label>
              <label className="checkbox-row"><input type="checkbox" checked={dailyHydration} onChange={(event) => setDailyHydration(event.target.checked)} /> {t("Daily hydration")}</label>
            </fieldset>

            <label>
              <span>{t("Sex reference")}</span>
              <select value={sexReference} onChange={(event) => setSexReference(event.target.value as SexReference)}>
                <option value="MALE">{t("Male")}</option>
                <option value="FEMALE">{t("Female")}</option>
              </select>
            </label>

            <label>
              <span>{t("Simulated age")}</span>
              <input type="number" min={18} max={90} value={age} onChange={(event) => setAge(Number(event.target.value))} />
            </label>

            <label>
              <span>{t("Body profile")}</span>
              <select value={bodyProfile} onChange={(event) => setBodyProfile(event.target.value as BodyProfile)}>
                <option value="UNDERWEIGHT">{t("Underweight")}</option>
                <option value="NORMAL">{t("Normal range")}</option>
                <option value="OVERWEIGHT">{t("Overweight")}</option>
                <option value="OBESITY">{t("Obesity range")}</option>
                <option value="ATHLETIC">{t("Athletic")}</option>
              </select>
            </label>

            <label>
              <span>{t("Trend")}</span>
              <select value={trend} onChange={(event) => setTrend(event.target.value as Trend)}>
                <option value="STABLE">{t("Stable")}</option>
                <option value="LOSS">{t("Gradual weight loss")}</option>
                <option value="GAIN">{t("Gradual weight gain")}</option>
                <option value="RECOMPOSITION">{t("Body recomposition")}</option>
                <option value="IRREGULAR">{t("Irregular adherence")}</option>
              </select>
            </label>
          </div>
        </article>

        <aside className="synthetic-data-preview">
          <p className="preview-label">{t("Estimated output")}</p>
          <strong>{preview.weightEntries}</strong><span>{t("weight entries")}</span>
          <strong>{preview.measurementEntries}</strong><span>{t("measurement entries")}</span>
          <strong>{preview.hydrationEntries}</strong><span>{t("hydration entries")}</span>
          <div className="preview-summary">
            {t("Scenario")}: {t(bodyProfile.toLowerCase())}, {t(sexReference.toLowerCase())}, {age}, {t(trend.toLowerCase())}
          </div>
          <button type="button" className="admin-primary-action" disabled>{t("Preview generation")}</button>
          <p>{t("The generation action will be enabled after the protected backend API and batch tracking are connected.")}</p>
        </aside>
      </section>
    </main>
  );
}
