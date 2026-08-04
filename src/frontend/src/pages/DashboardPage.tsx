import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import ArcMetricBadge from "../components/ArcMetricBadge";
import BrandLogo from "../components/BrandLogo";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../services/dashboardService";
import {
  createHydrationEntry,
  type HydrationUnit,
} from "../services/hydrationService";
import { formatMeasurement } from "../utils/measurementFormat";
import "./DashboardTiles.css";

interface StoredUser {
  firstName: string;
  email: string;
}

interface DashboardModule {
  title: string;
  description: string;
  action: string;
  path: string;
  admin?: boolean;
}

interface RememberedEntry {
  amount: number;
  unit: HydrationUnit;
}

interface MetricIconProps {
  children: ReactNode;
}

const LAST_MANUAL_ENTRY_KEY = "lastManualHydrationEntry";

const dashboardModules: DashboardModule[] = [
  { title: "Measurements", description: "Record weight, body measurements, and body-fat progress.", action: "Open Measurements", path: "/measurements" },
  { title: "Hydration", description: "Log water intake, update your daily goal, and review history.", action: "Open Hydration", path: "/hydration" },
  { title: "Progress Charts", description: "Review trends across weight, hydration, and body measurements.", action: "View Progress", path: "/progress" },
  { title: "Profile", description: "Manage personal details, goals, units, and localization preferences.", action: "Open Profile", path: "/profile" },
  { title: "Administration", description: "Manage translations and future company controls.", action: "Open Administration", path: "/admin", admin: true },
];

function MetricIcon({ children }: MetricIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function WeightIcon() {
  return <MetricIcon><path d="M7 4h10a3 3 0 0 1 3 3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3Z" /><path d="M9 8a3 3 0 0 1 6 0" /><path d="m12 8 1.5-1.5" /></MetricIcon>;
}

function WaterIcon() {
  return <MetricIcon><path d="M12 3s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11Z" /><path d="M9.5 15.5a3 3 0 0 0 4 1" /></MetricIcon>;
}

function BmiIcon() {
  return <MetricIcon><path d="M5 19V9" /><path d="M12 19V5" /><path d="M19 19v-7" /><path d="M3 19h18" /></MetricIcon>;
}

function CalendarIcon() {
  return <MetricIcon><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="m9 15 2 2 4-4" /></MetricIcon>;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function getRememberedEntry(): RememberedEntry | null {
  try {
    const raw = localStorage.getItem(LAST_MANUAL_ENTRY_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<RememberedEntry>;
    if (typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount <= 0 || (value.unit !== "oz" && value.unit !== "ml")) return null;
    return { amount: value.amount, unit: value.unit };
  } catch {
    return null;
  }
}

function quickAddKey(entry: RememberedEntry): string {
  return `${entry.amount}-${entry.unit}`;
}

function getWeightProgress(currentWeight: number | null | undefined, targetWeight: number | null | undefined): number | null {
  if (currentWeight == null || targetWeight == null || currentWeight <= 0 || targetWeight <= 0) return null;
  return (Math.min(currentWeight, targetWeight) / Math.max(currentWeight, targetWeight)) * 100;
}

function getMeasurementFreshness(date: string | null | undefined): number {
  if (!date) return 0;
  const elapsedDays = Math.max(0, (Date.now() - new Date(date).getTime()) / 86_400_000);
  return Math.max(0, 100 - elapsedDays * (100 / 7));
}

function getFreshnessStatus(date: string | null | undefined): string {
  if (!date) return "Add your first entry";
  const elapsedDays = Math.floor(Math.max(0, (Date.now() - new Date(date).getTime()) / 86_400_000));
  if (elapsedDays === 0) return "Updated today";
  if (elapsedDays === 1) return "Updated yesterday";
  if (elapsedDays <= 7) return `Updated ${elapsedDays} days ago`;
  return "Update recommended";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("currentUser");
  const user: StoredUser | null = storedUser ? JSON.parse(storedUser) : null;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickAddBusy, setQuickAddBusy] = useState<string | null>(null);
  const [quickAddMessage, setQuickAddMessage] = useState("");
  const [quickAddError, setQuickAddError] = useState("");

  useEffect(() => {
    getDashboardSummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  const weightUnit = summary?.preferredWeightUnit ?? "lb";
  const hydrationUnit = summary?.preferredHydrationUnit ?? "oz";
  const primaryWater = hydrationUnit === "ml" ? summary?.todayWaterMl ?? 0 : summary?.todayWaterOz ?? 0;
  const secondaryWaterUnit = hydrationUnit === "ml" ? "oz" : "ml";
  const secondaryWater = secondaryWaterUnit === "ml" ? summary?.todayWaterMl ?? 0 : summary?.todayWaterOz ?? 0;
  const hydrationGoal = summary?.dailyHydrationGoal ?? 0;
  const hydrationProgress = hydrationGoal > 0 ? (primaryWater / hydrationGoal) * 100 : null;

  const quickAddOptions = useMemo<RememberedEntry[]>(() => {
    const defaults = hydrationUnit === "ml"
      ? [250, 350, 500].map((amount) => ({ amount, unit: "ml" as const }))
      : [8, 12, 16].map((amount) => ({ amount, unit: "oz" as const }));
    const remembered = getRememberedEntry();
    if (!remembered || defaults.some((entry) => quickAddKey(entry) === quickAddKey(remembered))) return defaults;
    return [...defaults, remembered];
  }, [hydrationUnit]);

  const handleQuickAdd = async (entry: RememberedEntry): Promise<void> => {
    const key = quickAddKey(entry);
    setQuickAddBusy(key);
    setQuickAddMessage("");
    setQuickAddError("");
    try {
      await createHydrationEntry({ amount: entry.amount, unit: entry.unit, loggedAt: new Date().toISOString() });
      setSummary(await getDashboardSummary());
      setQuickAddMessage("Hydration entry added.");
    } catch {
      setQuickAddError("Unable to save hydration entry.");
    } finally {
      setQuickAddBusy(null);
    }
  };

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand-block">
          <BrandLogo className="dashboard-logo" />
          <p>{getGreeting()}, {user?.firstName ?? "User"}</p>
        </div>
        <button className="secondary-button" onClick={logout}>Log Out</button>
      </header>

      {loading ? (
        <section className="brand-loading" aria-live="polite">
          <BrandLogo variant="symbol" className="brand-loading-symbol" />
          <p>Preparing your dashboard...</p>
        </section>
      ) : (
        <>
          <section className="dashboard-metrics-grid" aria-label="Health and progress summary">
            <ArcMetricBadge
              title="Current Weight"
              icon={<WeightIcon />}
              value={summary?.currentWeight != null ? `${formatMeasurement(summary.currentWeight, weightUnit)} ${weightUnit}` : "--"}
              detail={summary?.targetWeight != null ? `Target ${formatMeasurement(summary.targetWeight, weightUnit)} ${weightUnit}` : "Add a target weight in your profile"}
              status={summary?.weightDifference != null ? `${summary.weightDifference > 0 ? "+" : ""}${formatMeasurement(summary.weightDifference, weightUnit)} ${weightUnit} since last measurement` : "Waiting for another measurement"}
              progress={getWeightProgress(summary?.currentWeight, summary?.targetWeight)}
              accent="#1f8b43"
            />

            <ArcMetricBadge
              title="Today's Water"
              icon={<WaterIcon />}
              value={`${formatMeasurement(primaryWater, hydrationUnit)} ${hydrationUnit}`}
              detail={hydrationGoal > 0 ? `Goal ${formatMeasurement(hydrationGoal, hydrationUnit)} ${hydrationUnit}` : `${formatMeasurement(secondaryWater, secondaryWaterUnit)} ${secondaryWaterUnit}`}
              status={hydrationProgress != null ? `${Math.min(100, Math.round(hydrationProgress))}% of daily goal` : "Set a hydration goal in your profile"}
              progress={hydrationProgress}
              accent="#168aad"
            >
              <div className="dashboard-quick-add" aria-label="Quick add hydration">
                <span className="dashboard-quick-add-label">Quick Add</span>
                <div className="dashboard-quick-add-buttons">
                  {quickAddOptions.map((entry) => {
                    const key = quickAddKey(entry);
                    return (
                      <button key={key} type="button" className="dashboard-quick-add-button" disabled={quickAddBusy !== null} onClick={() => void handleQuickAdd(entry)}>
                        {quickAddBusy === key ? "Adding..." : `+${entry.amount} ${entry.unit}`}
                      </button>
                    );
                  })}
                </div>
                {quickAddMessage && <p className="dashboard-quick-add-success" role="status">{quickAddMessage}</p>}
                {quickAddError && <p className="dashboard-quick-add-error" role="alert">{quickAddError}</p>}
              </div>
            </ArcMetricBadge>

            <ArcMetricBadge
              title="BMI"
              icon={<BmiIcon />}
              value={summary?.bmi != null ? formatMeasurement(summary.bmi, "%") : "--"}
              detail={summary?.bmiCategory ?? "Height required"}
              status={summary?.bmi != null ? "Calculated from your latest weight" : "Complete height and weight to calculate"}
              progress={summary?.bmi != null ? Math.min(100, (summary.bmi / 40) * 100) : null}
              accent="#7c5cbf"
            />

            <ArcMetricBadge
              title="Last Measurement"
              icon={<CalendarIcon />}
              value={summary?.lastMeasurementDate ? new Date(summary.lastMeasurementDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "None"}
              detail={summary?.lastMeasurementDate ? new Date(summary.lastMeasurementDate).toLocaleDateString() : "No measurement recorded"}
              status={getFreshnessStatus(summary?.lastMeasurementDate)}
              progress={getMeasurementFreshness(summary?.lastMeasurementDate)}
              accent="#d97745"
            />
          </section>

          <section className="dashboard-grid dashboard-actions-grid" aria-label="Dashboard modules">
            {dashboardModules.map((module) => (
              <button key={module.path} type="button" className={`dashboard-module-tile${module.admin ? " admin-module" : ""}`} onClick={() => navigate(module.path)}>
                <span className="dashboard-module-status">Available</span>
                <h2>{module.title}</h2>
                <p>{module.description}</p>
                <span className="dashboard-module-action"><span>{module.action}</span><span className="dashboard-module-arrow" aria-hidden="true">→</span></span>
              </button>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
