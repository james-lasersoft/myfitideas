import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import ArcMetricBadge from "../components/ArcMetricBadge";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../services/dashboardService";
import { formatMeasurement } from "../utils/measurementFormat";
import "./DashboardPage.css";

interface StoredUser {
  firstName: string;
  email: string;
}

interface DashboardIconProps {
  children: ReactNode;
}

function DashboardIcon({ children }: DashboardIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function WeightIcon() {
  return (
    <DashboardIcon>
      <path d="M7 4h10a3 3 0 0 1 3 3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
      <path d="m12 8 1.5-1.5" />
    </DashboardIcon>
  );
}

function WaterIcon() {
  return (
    <DashboardIcon>
      <path d="M12 3s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11Z" />
      <path d="M9.5 15.5a3 3 0 0 0 4 1" />
    </DashboardIcon>
  );
}

function BmiIcon() {
  return (
    <DashboardIcon>
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
      <path d="M3 19h18" />
    </DashboardIcon>
  );
}

function CalendarIcon() {
  return (
    <DashboardIcon>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </DashboardIcon>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function getWeightProgress(
  currentWeight: number | null | undefined,
  targetWeight: number | null | undefined
): number | null {
  if (
    currentWeight == null ||
    targetWeight == null ||
    currentWeight <= 0 ||
    targetWeight <= 0
  ) {
    return null;
  }

  return Math.min(currentWeight, targetWeight) /
    Math.max(currentWeight, targetWeight) * 100;
}

function getMeasurementFreshness(date: string | null | undefined): number {
  if (!date) return 0;

  const elapsedMs = Date.now() - new Date(date).getTime();
  const elapsedDays = Math.max(0, elapsedMs / 86_400_000);
  return Math.max(0, 100 - elapsedDays * (100 / 7));
}

function getFreshnessStatus(date: string | null | undefined): string {
  if (!date) return "Add your first entry";

  const elapsedMs = Date.now() - new Date(date).getTime();
  const elapsedDays = Math.floor(Math.max(0, elapsedMs / 86_400_000));

  if (elapsedDays === 0) return "Updated today";
  if (elapsedDays === 1) return "Updated yesterday";
  if (elapsedDays <= 7) return `Updated ${elapsedDays} days ago`;
  return "Update recommended";
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("currentUser");
  const user: StoredUser | null = storedUser
    ? JSON.parse(storedUser)
    : null;

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  const weightUnit = summary?.preferredWeightUnit ?? "lb";
  const hydrationUnit = summary?.preferredHydrationUnit ?? "oz";
  const primaryWater =
    hydrationUnit === "ml"
      ? summary?.todayWaterMl ?? 0
      : summary?.todayWaterOz ?? 0;
  const secondaryWaterUnit = hydrationUnit === "ml" ? "oz" : "ml";
  const secondaryWater =
    secondaryWaterUnit === "ml"
      ? summary?.todayWaterMl ?? 0
      : summary?.todayWaterOz ?? 0;
  const hydrationGoal = summary?.dailyHydrationGoal ?? 0;
  const hydrationProgress =
    hydrationGoal > 0 ? (primaryWater / hydrationGoal) * 100 : null;
  const weightProgress = getWeightProgress(
    summary?.currentWeight,
    summary?.targetWeight
  );
  const lastMeasurementProgress = getMeasurementFreshness(
    summary?.lastMeasurementDate
  );

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>My Fit Ideas</h1>
          <p>
            {getGreeting()}, {user?.firstName ?? "User"}
          </p>
        </div>

        <button onClick={logout}>Log Out</button>
      </header>

      {loading ? (
        <p className="dashboard-loading">Loading dashboard...</p>
      ) : (
        <>
          <section
            className="dashboard-metrics-grid"
            aria-label="Health and progress summary"
          >
            <ArcMetricBadge
              title="Current Weight"
              icon={<WeightIcon />}
              value={
                summary?.currentWeight != null
                  ? `${formatMeasurement(summary.currentWeight, weightUnit)} ${weightUnit}`
                  : "--"
              }
              detail={
                summary?.targetWeight != null
                  ? `Target ${formatMeasurement(summary.targetWeight, weightUnit)} ${weightUnit}`
                  : "Add a target weight in your profile"
              }
              status={
                summary?.weightDifference != null
                  ? `${summary.weightDifference > 0 ? "+" : ""}${formatMeasurement(summary.weightDifference, weightUnit)} ${weightUnit} since last entry`
                  : "Waiting for another measurement"
              }
              progress={weightProgress}
              accent="#2f7d6d"
              onClick={() => navigate("/measurements")}
              ariaLabel="Open measurements and review current weight progress"
            />

            <ArcMetricBadge
              title="Today's Water"
              icon={<WaterIcon />}
              value={`${formatMeasurement(primaryWater, hydrationUnit)} ${hydrationUnit}`}
              detail={
                hydrationGoal > 0
                  ? `Goal ${formatMeasurement(hydrationGoal, hydrationUnit)} ${hydrationUnit}`
                  : `${formatMeasurement(secondaryWater, secondaryWaterUnit)} ${secondaryWaterUnit}`
              }
              status={
                hydrationProgress != null
                  ? `${Math.min(100, Math.round(hydrationProgress))}% of daily goal`
                  : "Set a hydration goal in your profile"
              }
              progress={hydrationProgress}
              accent="#168aad"
              onClick={() => navigate("/hydration")}
              ariaLabel="Open hydration and review today's water progress"
            />

            <ArcMetricBadge
              title="BMI"
              icon={<BmiIcon />}
              value={
                summary?.bmi != null
                  ? formatMeasurement(summary.bmi, "%")
                  : "--"
              }
              detail={summary?.bmiCategory ?? "Height required"}
              status={
                summary?.bmi != null
                  ? "Calculated from your latest weight"
                  : "Complete height and weight to calculate"
              }
              progress={
                summary?.bmi != null
                  ? Math.min(100, (summary.bmi / 40) * 100)
                  : null
              }
              accent="#7c5cbf"
              onClick={() => navigate("/profile")}
              ariaLabel="Open profile and review BMI inputs"
            />

            <ArcMetricBadge
              title="Last Measurement"
              icon={<CalendarIcon />}
              value={
                summary?.lastMeasurementDate
                  ? new Date(summary.lastMeasurementDate).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" }
                    )
                  : "None"
              }
              detail={
                summary?.lastMeasurementDate
                  ? new Date(summary.lastMeasurementDate).toLocaleDateString()
                  : "No measurement recorded"
              }
              status={getFreshnessStatus(summary?.lastMeasurementDate)}
              progress={lastMeasurementProgress}
              accent="#d97745"
              onClick={() => navigate("/measurements")}
              ariaLabel="Open measurements and add a new measurement"
            />
          </section>

          <section
            className="dashboard-grid dashboard-actions-grid"
            aria-label="Dashboard actions"
          >
            <article className="dashboard-card dashboard-action-card">
              <div>
                <h2>Measurements</h2>
                <p>Record body measurements and monitor changes over time.</p>
              </div>
              <button onClick={() => navigate("/measurements")}>
                Open Measurements
              </button>
            </article>

            <article className="dashboard-card dashboard-action-card">
              <div>
                <h2>Hydration</h2>
                <p>Log water intake and follow your daily hydration goal.</p>
              </div>
              <button onClick={() => navigate("/hydration")}>
                Open Hydration
              </button>
            </article>

            <article className="dashboard-card dashboard-action-card">
              <div>
                <h2>Progress Charts</h2>
                <p>Review weight, measurement, and hydration trends.</p>
              </div>
              <button type="button" onClick={() => navigate("/progress")}>
                View Progress
              </button>
            </article>

            <article className="dashboard-card dashboard-action-card">
              <div>
                <h2>Profile</h2>
                <p>Manage goals, preferred units, and personal settings.</p>
              </div>
              <button type="button" onClick={() => navigate("/profile")}>
                Open Profile
              </button>
            </article>
          </section>
        </>
      )}
    </main>
  );
}
