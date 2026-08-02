import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  filterHydrationByRange,
  filterMeasurementsByRange,
  getProgressChartData,
  groupHydrationByDate,
  type ChartRange,
  type ProgressChartData,
} from "../services/progressChartService";
import {
  formatMeasurement,
  roundMeasurementForUnit,
  type MeasurementUnit,
} from "../utils/measurementFormat";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function formatChartDate(dateValue: string): string {
  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function hasMeasurementValues(values: Array<number | null>): boolean {
  return values.some((value) => value !== null);
}

function roundValues(
  values: Array<number | null>,
  unit: MeasurementUnit
): Array<number | null> {
  return values.map((value) =>
    value === null ? null : roundMeasurementForUnit(value, unit)
  );
}

function createLineOptions(
  unit: MeasurementUnit,
  beginAtZero = false
): ChartOptions<"line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label ?? "Value";
            const value = context.parsed.y;
            return value === null
              ? `${label}: No data`
              : `${label}: ${formatMeasurement(value, unit)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero,
        ticks: {
          callback: (value) => formatMeasurement(Number(value), unit),
        },
      },
    },
  };
}

export default function ProgressChartsPage() {
  const navigate = useNavigate();
  const [chartData, setChartData] = useState<ProgressChartData | null>(null);
  const [range, setRange] = useState<ChartRange>("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadChartData() {
      try {
        setLoading(true);
        setError("");
        setChartData(await getProgressChartData());
      } catch (loadError) {
        console.error("Unable to load progress chart data:", loadError);
        setError("Unable to load progress charts. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadChartData();
  }, []);

  const filteredMeasurements = useMemo(
    () =>
      chartData
        ? filterMeasurementsByRange(chartData.measurements, range)
        : [],
    [chartData, range]
  );

  const filteredHydration = useMemo(
    () =>
      chartData
        ? filterHydrationByRange(chartData.hydrationEntries, range)
        : [],
    [chartData, range]
  );

  const hydrationTotals = useMemo(
    () =>
      chartData
        ? groupHydrationByDate(
            filteredHydration,
            chartData.profile.preferredHydrationUnit,
            range
          )
        : [],
    [chartData, filteredHydration, range]
  );

  const weightUnit = chartData?.profile.preferredWeightUnit ?? "lb";
  const lengthUnit = chartData?.profile.preferredLengthUnit ?? "in";
  const hydrationUnit = chartData?.profile.preferredHydrationUnit ?? "oz";

  const measurementLabels = filteredMeasurements.map((measurement) =>
    formatChartDate(measurement.measurementDate)
  );

  const weightValues = roundValues(
    filteredMeasurements.map((measurement) => measurement.weight),
    weightUnit
  );
  const bodyFatValues = roundValues(
    filteredMeasurements.map((measurement) => measurement.bodyFat),
    "%"
  );
  const waistValues = roundValues(
    filteredMeasurements.map((measurement) => measurement.waist),
    lengthUnit
  );
  const chestValues = roundValues(
    filteredMeasurements.map((measurement) => measurement.chest),
    lengthUnit
  );
  const hipsValues = roundValues(
    filteredMeasurements.map((measurement) => measurement.hips),
    lengthUnit
  );

  const hasWeightData = hasMeasurementValues(weightValues);
  const hasBodyFatData = hasMeasurementValues(bodyFatValues);
  const hasBodyMeasurementData =
    hasMeasurementValues(waistValues) ||
    hasMeasurementValues(chestValues) ||
    hasMeasurementValues(hipsValues);

  if (loading) {
    return (
      <main className="progress-charts-page">
        <section className="progress-charts-card">
          <p>Loading progress charts...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="progress-charts-page">
      <section className="progress-charts-header">
        <div>
          <p className="section-eyebrow">Progress analytics</p>
          <h1>Progress Charts</h1>
          <p>Review changes in your measurements and hydration over time.</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </section>

      <section className="chart-range-card">
        <div>
          <h2>Chart Range</h2>
          <p>Select how much historical data to display.</p>
        </div>
        <div
          className="chart-range-buttons"
          role="group"
          aria-label="Chart date range"
        >
          {[
            { value: "7", label: "7 Days" },
            { value: "30", label: "30 Days" },
            { value: "90", label: "90 Days" },
            { value: "all", label: "All Time" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                range === option.value ? "range-button active" : "range-button"
              }
              onClick={() => setRange(option.value as ChartRange)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="error-message">{error}</div>}

      {!error && chartData && (
        <section className="charts-grid">
          <article className="chart-card chart-card-wide">
            <div className="chart-card-header">
              <div>
                <h2>Weight Trend</h2>
                <p>Body weight recorded during the selected period.</p>
              </div>
              <span className="chart-unit">{weightUnit}</span>
            </div>
            {hasWeightData ? (
              <div className="chart-container">
                <Line
                  options={createLineOptions(weightUnit)}
                  data={{
                    labels: measurementLabels,
                    datasets: [
                      {
                        label: `Weight (${weightUnit})`,
                        data: weightValues,
                        borderColor: "rgb(37, 99, 235)",
                        backgroundColor: "rgba(37, 99, 235, 0.12)",
                        tension: 0.3,
                        spanGaps: true,
                        fill: true,
                      },
                    ],
                  }}
                />
              </div>
            ) : (
              <div className="chart-empty-state">
                No weight measurements are available for this period.
              </div>
            )}
          </article>

          <article className="chart-card">
            <div className="chart-card-header">
              <div>
                <h2>Body Fat</h2>
                <p>Body-fat percentage measurements.</p>
              </div>
              <span className="chart-unit">%</span>
            </div>
            {hasBodyFatData ? (
              <div className="chart-container">
                <Line
                  options={createLineOptions("%")}
                  data={{
                    labels: measurementLabels,
                    datasets: [
                      {
                        label: "Body fat (%)",
                        data: bodyFatValues,
                        borderColor: "rgb(147, 51, 234)",
                        backgroundColor: "rgba(147, 51, 234, 0.12)",
                        tension: 0.3,
                        spanGaps: true,
                        fill: true,
                      },
                    ],
                  }}
                />
              </div>
            ) : (
              <div className="chart-empty-state">
                No body-fat measurements are available for this period.
              </div>
            )}
          </article>

          <article className="chart-card">
            <div className="chart-card-header">
              <div>
                <h2>Daily Hydration</h2>
                <p>Total hydration logged each day.</p>
              </div>
              <span className="chart-unit">{hydrationUnit}</span>
            </div>
            {hydrationTotals.length > 0 ? (
              <div className="chart-container">
                <Line
                  options={createLineOptions(hydrationUnit, true)}
                  data={{
                    labels: hydrationTotals.map((item) =>
                      formatChartDate(`${item.date}T00:00:00`)
                    ),
                    datasets: [
                      {
                        label: `Hydration (${hydrationUnit})`,
                        data: hydrationTotals.map((item) => item.total),
                        borderColor: "rgb(8, 145, 178)",
                        backgroundColor: "rgba(8, 145, 178, 0.12)",
                        tension: 0.3,
                        fill: true,
                      },
                    ],
                  }}
                />
              </div>
            ) : (
              <div className="chart-empty-state">
                No hydration entries are available for this period.
              </div>
            )}
          </article>

          <article className="chart-card chart-card-wide">
            <div className="chart-card-header">
              <div>
                <h2>Body Measurements</h2>
                <p>Waist, chest, and hip measurements.</p>
              </div>
              <span className="chart-unit">{lengthUnit}</span>
            </div>
            {hasBodyMeasurementData ? (
              <div className="chart-container">
                <Line
                  options={createLineOptions(lengthUnit)}
                  data={{
                    labels: measurementLabels,
                    datasets: [
                      {
                        label: `Waist (${lengthUnit})`,
                        data: waistValues,
                        borderColor: "rgb(234, 88, 12)",
                        backgroundColor: "rgba(234, 88, 12, 0.1)",
                        tension: 0.3,
                        spanGaps: true,
                      },
                      {
                        label: `Chest (${lengthUnit})`,
                        data: chestValues,
                        borderColor: "rgb(22, 163, 74)",
                        backgroundColor: "rgba(22, 163, 74, 0.1)",
                        tension: 0.3,
                        spanGaps: true,
                      },
                      {
                        label: `Hips (${lengthUnit})`,
                        data: hipsValues,
                        borderColor: "rgb(219, 39, 119)",
                        backgroundColor: "rgba(219, 39, 119, 0.1)",
                        tension: 0.3,
                        spanGaps: true,
                      },
                    ],
                  }}
                />
              </div>
            ) : (
              <div className="chart-empty-state">
                No body measurements are available for this period.
              </div>
            )}
          </article>
        </section>
      )}
    </main>
  );
}
