import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../services/dashboardService";
import { formatMeasurement } from "../utils/measurementFormat";

interface StoredUser {
  firstName: string;
  email: string;
}

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
        <div>
          <h1>My Fit Ideas</h1>
          <p>
            {getGreeting()}, {user?.firstName ?? "User"}
          </p>
        </div>

        <button onClick={logout}>Log Out</button>
      </header>

      {loading ? (
        <p>Loading dashboard...</p>
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

          <section className="dashboard-grid">
            <article className="dashboard-card">
              <h2>Measurements</h2>
              <button onClick={() => navigate("/measurements")}>
                Open Measurements
              </button>
            </article>

            <article className="dashboard-card">
              <h2>Hydration</h2>
              <button onClick={() => navigate("/hydration")}>
                Open Hydration
              </button>
            </article>

            <article className="dashboard-card">
              <h2>Progress Charts</h2>
              <button type="button" onClick={() => navigate("/progress")}>
                View Progress
              </button>
            </article>

            <article className="dashboard-card">
              <h2>Profile</h2>
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
