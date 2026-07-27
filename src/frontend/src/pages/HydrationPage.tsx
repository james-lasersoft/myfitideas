import {
  useCallback,
  useEffect,
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

function getTodayDate(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
}

export default function HydrationPage() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<HydrationEntry[]>(
    []
  );
  const [dailyTotal, setDailyTotal] =
    useState<DailyHydrationTotal | null>(null);

  const [amount, setAmount] = useState("");
  const [unit, setUnit] =
    useState<HydrationUnit>("oz");
  const [selectedDate, setSelectedDate] =
    useState(getTodayDate());

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const loadHydrationData = useCallback(
    async (): Promise<void> => {
      const [hydrationEntries, total] = await Promise.all([
        getHydrationEntries(),
        getDailyHydrationTotal(selectedDate),
      ]);

      setEntries(hydrationEntries);
      setDailyTotal(total);
    },
    [selectedDate]
  );

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    setError("");

    Promise.all([
      getHydrationEntries(),
      getDailyHydrationTotal(selectedDate),
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
  }, [selectedDate]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    setMessage("");
    setError("");

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Enter a hydration amount greater than zero."
      );
      return;
    }

    setIsSaving(true);

    try {
      await createHydrationEntry({
        amount: numericAmount,
        unit,
        loggedAt: new Date().toISOString(),
      });

      setAmount("");
      setMessage("Hydration entry saved successfully.");

      await loadHydrationData();
    } catch {
      setError("Unable to save hydration entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (
    id: string
  ): Promise<void> => {
    const shouldDelete = window.confirm(
      "Delete this hydration entry?"
    );

    if (!shouldDelete) {
      return;
    }

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
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Hydration Tracking</h1>
          <p>
            Record water intake and review daily totals.
          </p>
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
          <h2>Daily Total</h2>

          <label className="hydration-date-filter">
            Select Date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(event.target.value)
              }
            />
          </label>

          {isLoading ? (
            <p>Loading daily total...</p>
          ) : dailyTotal ? (
            <div className="hydration-total">
              <strong>
                {dailyTotal.totalOz.toFixed(1)} oz
              </strong>
              <span>
                {dailyTotal.totalMl.toFixed(0)} ml
              </span>
              <p>
                {dailyTotal.entries.length}{" "}
                {dailyTotal.entries.length === 1
                  ? "entry"
                  : "entries"}
              </p>
            </div>
          ) : (
            <p>No hydration total is available.</p>
          )}
        </article>

        <article className="dashboard-card">
          <h2>Add Water Intake</h2>

          <form
            className="hydration-form"
            onSubmit={handleSubmit}
          >
            <label>
              Amount
              <input
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
                  setUnit(
                    event.target.value as HydrationUnit
                  )
                }
              >
                <option value="oz">Ounces</option>
                <option value="ml">Milliliters</option>
              </select>
            </label>

            {message && (
              <p className="success-message">
                {message}
              </p>
            )}

            {error && (
              <p className="error-message">{error}</p>
            )}

            <button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : "Save Hydration Entry"}
            </button>
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
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="history-item hydration-history-item"
              >
                <div>
                  <strong>
                    {entry.amount} {entry.unit}
                  </strong>

                  <p>
                    {new Date(
                      entry.loggedAt
                    ).toLocaleDateString()}
                    {" at "}
                    {new Date(
                      entry.loggedAt
                    ).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <button
                  type="button"
                  className="delete-button"
                  disabled={deletingId === entry.id}
                  onClick={() =>
                    handleDelete(entry.id)
                  }
                >
                  {deletingId === entry.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
