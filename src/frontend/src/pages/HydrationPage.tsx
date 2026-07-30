import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  createHydrationEntry,
  deleteHydrationEntry,
  getDailyHydrationTotal,
  getHydrationEntries,
  type DailyHydrationTotal,
  type HydrationEntry,
  type HydrationUnit,
} from "../services/hydrationService";
import "./HydrationPage.css";

const HYDRATION_GOAL_KEY = "hydrationGoalOz";
const DEFAULT_HYDRATION_GOAL_OZ = 64;

function getLocalDateValue(date = new Date()): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
}

function getLocalTimeValue(date = new Date()): string {
  return [
    date.getHours().toString().padStart(2, "0"),
    date.getMinutes().toString().padStart(2, "0"),
  ].join(":");
}

function createLoggedAt(
  dateValue: string,
  timeValue: string
): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);

  const loggedAt = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0
  );

  if (Number.isNaN(loggedAt.getTime())) {
    throw new Error("Invalid hydration date or time.");
  }

  return loggedAt.toISOString();
}

function getStoredGoal(): number {
  const storedGoal = Number(localStorage.getItem(HYDRATION_GOAL_KEY));

  return Number.isFinite(storedGoal) && storedGoal > 0
    ? storedGoal
    : DEFAULT_HYDRATION_GOAL_OZ;
}

function getDateGroupLabel(dateKey: string): string {
  const today = getLocalDateValue();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateValue(yesterdayDate);

  if (dateKey === today) return "Today";
  if (dateKey === yesterday) return "Yesterday";

  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function HydrationPage() {
  const navigate = useNavigate();
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<HydrationEntry[]>([]);
  const [dailyTotal, setDailyTotal] =
    useState<DailyHydrationTotal | null>(null);

  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<HydrationUnit>("oz");
  const [summaryDate, setSummaryDate] = useState(
    getLocalDateValue()
  );
  const [entryDate, setEntryDate] = useState(
    getLocalDateValue()
  );
  const [entryTime, setEntryTime] = useState(
    getLocalTimeValue()
  );
  const [goalOz, setGoalOz] = useState(getStoredGoal());
  const [goalInput, setGoalInput] = useState(
    getStoredGoal().toString()
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);
  const [showAddAnother, setShowAddAnother] = useState(false);

  const groupedEntries = useMemo(() => {
    const sortedEntries = [...entries].sort(
      (a, b) =>
        new Date(b.loggedAt).getTime() -
        new Date(a.loggedAt).getTime()
    );

    return sortedEntries.reduce<Record<string, HydrationEntry[]>>(
      (groups, entry) => {
        const dateKey = getLocalDateValue(new Date(entry.loggedAt));
        groups[dateKey] ??= [];
        groups[dateKey].push(entry);
        return groups;
      },
      {}
    );
  }, [entries]);

  const goalProgress = Math.min(
    ((dailyTotal?.totalOz ?? 0) / goalOz) * 100,
    100
  );

  const loadHydrationData = useCallback(
    async (date = summaryDate): Promise<void> => {
      const [hydrationEntries, total] = await Promise.all([
        getHydrationEntries(),
        getDailyHydrationTotal(date),
      ]);

      setEntries(hydrationEntries);
      setDailyTotal(total);
    },
    [summaryDate]
  );

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    setError("");

    Promise.all([
      getHydrationEntries(),
      getDailyHydrationTotal(summaryDate),
    ])
      .then(([hydrationEntries, total]) => {
        if (!isCancelled) {
          setEntries(hydrationEntries);
          setDailyTotal(total);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Unable to load hydration records.");
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
  }, [summaryDate]);

  const saveEntry = async (
    entryAmount: number,
    entryUnit: HydrationUnit
  ): Promise<void> => {
    if (!entryDate || !entryTime) {
      setError("Select both an entry date and time.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      await createHydrationEntry({
        amount: entryAmount,
        unit: entryUnit,
        loggedAt: createLoggedAt(entryDate, entryTime),
      });

      setAmount("");
      setEntryTime(getLocalTimeValue());
      setSummaryDate(entryDate);
      setMessage(
        `${entryAmount} ${entryUnit} added successfully.`
      );
      setShowAddAnother(true);
      await loadHydrationData(entryDate);
    } catch {
      setError("Unable to save hydration entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("Enter a hydration amount greater than zero.");
      return;
    }

    await saveEntry(numericAmount, unit);
  };

  const handleQuickAdd = async (
    quickAmount: number,
    quickUnit: HydrationUnit
  ): Promise<void> => {
    await saveEntry(quickAmount, quickUnit);
  };

  const handleAddAnother = (): void => {
    setMessage("");
    setShowAddAnother(false);
    setEntryTime(getLocalTimeValue());
    amountInputRef.current?.focus();
  };

  const handleGoalSave = (): void => {
    const numericGoal = Number(goalInput);

    if (!Number.isFinite(numericGoal) || numericGoal <= 0) {
      setError("Enter a hydration goal greater than zero.");
      return;
    }

    localStorage.setItem(HYDRATION_GOAL_KEY, numericGoal.toString());
    setGoalOz(numericGoal);
    setError("");
    setMessage("Daily hydration goal updated.");
  };

  const handleDelete = async (id: string): Promise<void> => {
    const shouldDelete = window.confirm(
      "Delete this hydration entry?"
    );

    if (!shouldDelete) return;

    setMessage("");
    setError("");
    setDeletingId(id);

    try {
      await deleteHydrationEntry(id);
      setMessage("Hydration entry deleted successfully.");
      await loadHydrationData();
    } catch {
      setError("Unable to delete hydration entry.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="dashboard-page hydration-page">
      <header className="dashboard-header">
        <div>
          <h1>Hydration Tracking</h1>
          <p>Record water intake and review daily totals.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </header>

      <section className="hydration-summary">
        <article className="dashboard-card">
          <h2>Daily Progress</h2>

          <label className="hydration-date-filter">
            Select Date
            <input
              type="date"
              value={summaryDate}
              max={getLocalDateValue()}
              onChange={(event) =>
                setSummaryDate(event.target.value)
              }
            />
          </label>

          {isLoading ? (
            <p>Loading daily total...</p>
          ) : dailyTotal ? (
            <div className="hydration-total">
              <strong>{dailyTotal.totalOz.toFixed(1)} oz</strong>
              <span>{dailyTotal.totalMl.toFixed(0)} ml</span>
              <p>
                {dailyTotal.entries.length}{" "}
                {dailyTotal.entries.length === 1
                  ? "entry"
                  : "entries"}
              </p>

              <div className="hydration-progress-header">
                <span>{Math.round(goalProgress)}%</span>
                <span>Goal: {goalOz} oz</span>
              </div>
              <div
                className="hydration-progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(goalProgress)}
              >
                <div
                  className="hydration-progress-fill"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>

              <div className="hydration-goal-editor">
                <label>
                  Daily Goal (oz)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={goalInput}
                    onChange={(event) =>
                      setGoalInput(event.target.value)
                    }
                  />
                </label>
                <button type="button" onClick={handleGoalSave}>
                  Update Goal
                </button>
              </div>
            </div>
          ) : (
            <p>No hydration total is available.</p>
          )}
        </article>

        <article className="dashboard-card">
          <h2>Add Water Intake</h2>

          <div className="quick-add-section">
            <span>Quick Add</span>
            <div className="quick-add-buttons">
              {[
                [8, "oz"],
                [12, "oz"],
                [16, "oz"],
                [500, "ml"],
              ].map(([quickAmount, quickUnit]) => (
                <button
                  key={`${quickAmount}-${quickUnit}`}
                  type="button"
                  className="quick-add-button"
                  disabled={isSaving}
                  onClick={() =>
                    handleQuickAdd(
                      Number(quickAmount),
                      quickUnit as HydrationUnit
                    )
                  }
                >
                  +{quickAmount} {quickUnit}
                </button>
              ))}
            </div>
          </div>

          <form className="hydration-form" onSubmit={handleSubmit}>
            <div className="hydration-form-grid">
              <label>
                Amount
                <input
                  ref={amountInputRef}
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                />
              </label>

              <label>
                Unit
                <select
                  value={unit}
                  onChange={(event) =>
                    setUnit(event.target.value as HydrationUnit)
                  }
                >
                  <option value="oz">Ounces</option>
                  <option value="ml">Milliliters</option>
                </select>
              </label>

              <label>
                Entry Date
                <input
                  type="date"
                  required
                  value={entryDate}
                  max={getLocalDateValue()}
                  onChange={(event) =>
                    setEntryDate(event.target.value)
                  }
                />
              </label>

              <label>
                Entry Time
                <input
                  type="time"
                  required
                  value={entryTime}
                  onChange={(event) =>
                    setEntryTime(event.target.value)
                  }
                />
              </label>
            </div>

            {message && (
              <p className="success-message">{message}</p>
            )}
            {error && <p className="error-message">{error}</p>}

            <div className="hydration-form-actions">
              <button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Hydration Entry"}
              </button>
              {showAddAnother && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleAddAnother}
                >
                  Add Another
                </button>
              )}
            </div>
          </form>
        </article>
      </section>

      <section className="dashboard-card hydration-history-card">
        <h2>Hydration History</h2>

        {isLoading ? (
          <p>Loading hydration history...</p>
        ) : entries.length === 0 ? (
          <p>No hydration entries have been recorded yet.</p>
        ) : (
          <div className="hydration-history">
            {Object.entries(groupedEntries).map(
              ([dateKey, dateEntries]) => (
                <section key={dateKey} className="hydration-date-group">
                  <h3>{getDateGroupLabel(dateKey)}</h3>
                  <div className="hydration-date-group-items">
                    {dateEntries.map((entry) => (
                      <article
                        key={entry.id}
                        className="history-item hydration-history-item"
                      >
                        <div>
                          <strong>
                            {entry.amount} {entry.unit}
                          </strong>
                          <p>
                            {new Date(entry.loggedAt).toLocaleTimeString(
                              [],
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="delete-button"
                          disabled={deletingId === entry.id}
                          onClick={() => handleDelete(entry.id)}
                        >
                          {deletingId === entry.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}
