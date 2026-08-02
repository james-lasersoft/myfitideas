import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../services/dashboardService";
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

const dashboardModules: DashboardModule[] = [
  {
    title: "Measurements",
    description: "Record weight, body measurements, and body-fat progress.",
    action: "Open Measurements",
    path: "/measurements",
  },
  {
    title: "Hydration",
    description: "Log water intake, update your daily goal, and review history.",
    action: "Open Hydration",
    path: "/hydration",
  },
  {
    title: "Progress Charts",
    description: "Review trends across weight, hydration, and body measurements.",
    action: "View Progress",
    path: "/progress",
  },
  {
    title: "Profile",
    description: "Manage personal details, goals, units, and localization preferences.",
    action: "Open Profile",
    path: "/profile",
  },
  {
    title: "Administration",
    description: "Manage translations and future company controls.",
    action: "Open Administration",
    path: "/admin",
    admin: true,
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
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

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand-block">
          <BrandLogo className="dashboard-logo" />
          <p>
            {getGreeting()}, {user?.firstName ?? "User"}
          </p>
        </div>

        <button className="secondary-button" onClick={logout}>
          Log Out
        </button>
      </header>

      {loading ? (
        <section className="brand-loading" aria-live="polite">
          <BrandLogo variant="symbol" className="brand-loading-symbol" />
          <p>Preparing your dashboard...</p>
        </section>
      ) : (
        <>
          <section className="dashboard-grid">
            <article className="dashboard-card">
              <h2>Current Weight</h2>
              <h1>
                {summary?.currentWeight != null
                  ? `${formatMeasurement(summary.currentWeight, weightUnit)} ${weightUnit}`
                  : "--"}
              </h1>

              {summary?.weightDifference != null && (
                <p>
                  {summary.weightDifference > 0 ? "+" : ""}
                  {formatMeasurement(summary.weightDifference, weightUnit)} {weightUnit} since last measurement
                </p>
              )}
            </article>

            <article className="dashboard-card">
              <h2>Today's Water</h2>
              <h1>
                {formatMeasurement(primaryWater, hydrationUnit)} {hydrationUnit}
              </h1>
              <p>
                {formatMeasurement(secondaryWater, secondaryWaterUnit)} {secondaryWaterUnit}
              </p>
            </article>

            <article className="dashboard-card">
              <h2>BMI</h2>
              <h1>
                {summary?.bmi != null
                  ? formatMeasurement(summary.bmi, "%")
                  : "--"}
              </h1>
              <p>{summary?.bmiCategory ?? "Height required"}</p>
            </article>

            <article className="dashboard-card">
              <h2>Last Measurement</h2>
              <p>
                {summary?.lastMeasurementDate
                  ? new Date(summary.lastMeasurementDate).toLocaleDateString()
                  : "None"}
              </p>
            </article>
          </section>

          <section className="dashboard-grid dashboard-actions-grid" aria-label="Dashboard modules">
            {dashboardModules.map((module) => (
              <button
                key={module.path}
                type="button"
                className={`dashboard-module-tile${module.admin ? " admin-module" : ""}`}
                onClick={() => navigate(module.path)}
              >
                <span className="dashboard-module-status">Available</span>
                <h2>{module.title}</h2>
                <p>{module.description}</p>
                <span className="dashboard-module-action">
                  <span>{module.action}</span>
                  <span className="dashboard-module-arrow" aria-hidden="true">→</span>
                </span>
              </button>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
