import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import LocalizedTimeInput from "../components/LocalizedTimeInput";
import {
  createHydrationEntry,
  deleteHydrationEntry,
  getDailyHydrationTotal,
  getHydrationEntries,
  type DailyHydrationTotal,
  type HydrationEntry,
  type HydrationUnit,
} from "../services/hydrationService";
import { getProfile, type UserProfile } from "../services/profileService";
import {
  currentTimeInputValue,
  formatUserDate,
  formatUserTime,
  type LocalizationPreferences,
} from "../utils/localizationFormat";
import "./HydrationPage.css";
import "./HydrationEntryLayout.css";

const LAST_MANUAL_ENTRY_KEY = "lastManualHydrationEntry";
const LAST_BEVERAGE_KEY = "lastHydrationBeverage";
const BEVERAGE_USAGE_KEY = "hydrationBeverageUsage";
const ARC_LENGTH = 75;
const FALLBACK_LOCALIZATION_PREFERENCES: LocalizationPreferences = {
  preferredLanguage: "en",
  preferredDateFormat: "LOCALE",
  preferredTimeFormat: "12",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

interface RememberedEntry {
  amount: number;
  unit: HydrationUnit;
}

interface BeverageType {
  id: string;
  label: string;
  icon: string;
}

const BEVERAGE_TYPES: BeverageType[] = [
  { id: "water", label: "Water", icon: "💧" },
  { id: "coffee", label: "Coffee", icon: "☕" },
  { id: "tea", label: "Tea", icon: "🍵" },
  { id: "sports-drink", label: "Sports Drink", icon: "⚡" },
  { id: "milk", label: "Milk", icon: "🥛" },
  { id: "juice", label: "Juice", icon: "🧃" },
  { id: "soda", label: "Soda", icon: "🥤" },
  { id: "sparkling-water", label: "Sparkling Water", icon: "🫧" },
  { id: "energy-drink", label: "Energy Drink", icon: "🔋" },
  { id: "smoothie", label: "Smoothie", icon: "🥭" },
  { id: "oral-rehydration", label: "Oral Rehydration Drink", icon: "🧂" },
  { id: "other", label: "Other Beverage", icon: "⋯" },
];

function getLocalDateValue(date = new Date()): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function createLoggedAt(dateValue: string, timeValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  const loggedAt = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (Number.isNaN(loggedAt.getTime())) {
    throw new Error("Invalid hydration date or time.");
  }

  return loggedAt.toISOString();
}

function getDateGroupLabel(
  dateKey: string,
  preferences: LocalizationPreferences
): string {
  const today = getLocalDateValue();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateValue(yesterdayDate);

  if (dateKey === today) return "Today";
  if (dateKey === yesterday) return "Yesterday";

  const [year, month, day] = dateKey.split("-").map(Number);
  return formatUserDate(new Date(year, month - 1, day), preferences);
}

function getRememberedEntry(): RememberedEntry | null {
  try {
    const raw = localStorage.getItem(LAST_MANUAL_ENTRY_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<RememberedEntry>;
    if (
      typeof value.amount !== "number" ||
      !Number.isFinite(value.amount) ||
      value.amount <= 0 ||
      (value.unit !== "oz" && value.unit !== "ml")
    ) {
      return null;
    }

    return { amount: value.amount, unit: value.unit };
  } catch {
    return null;
  }
}

function getInitialBeverage(): string {
  const saved = localStorage.getItem(LAST_BEVERAGE_KEY);
  return BEVERAGE_TYPES.some((beverage) => beverage.id === saved)
    ? saved ?? "water"
    : "water";
}

function getBeverageUsage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BEVERAGE_USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) =>
          BEVERAGE_TYPES.some((beverage) => beverage.id === key) &&
          typeof value === "number" &&
          Number.isFinite(value)
      )
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

function formatAmount(value: number, unit: HydrationUnit): string {
  return unit === "ml" ? value.toFixed(0) : value.toFixed(1);
}

export default function HydrationPage() {
  const navigate = useNavigate();
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<HydrationEntry[]>([]);
  const [dailyTotal, setDailyTotal] = useState<DailyHydrationTotal | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rememberedEntry, setRememberedEntry] = useState<RememberedEntry | null>(
    getRememberedEntry()
  );
  const [selectedBeverageId, setSelectedBeverageId] = useState(getInitialBeverage);
  const [beverageUsage, setBeverageUsage] = useState<Record<string, number>>(
    getBeverageUsage
  );

  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<HydrationUnit>("oz");
  const [summaryDate, setSummaryDate] = useState(getLocalDateValue());
  const [entryDate, setEntryDate] = useState(getLocalDateValue());
  const [entryTime, setEntryTime] = useState(currentTimeInputValue());

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddAnother, setShowAddAnother] = useState(false);

  const localizationPreferences: LocalizationPreferences =
    profile ?? FALLBACK_LOCALIZATION_PREFERENCES;
  const preferredUnit = profile?.preferredHydrationUnit ?? "oz";
  const goal = profile?.dailyHydrationGoal ?? 0;
  const primaryTotal =
    preferredUnit === "ml"
      ? dailyTotal?.totalMl ?? 0
      : dailyTotal?.totalOz ?? 0;
  const rawGoalProgress = goal > 0 ? (primaryTotal / goal) * 100 : 0;
  const goalProgress = Math.min(rawGoalProgress, 100);
  const progressArc = (goalProgress / 100) * ARC_LENGTH;
  const selectedBeverage =
    BEVERAGE_TYPES.find((beverage) => beverage.id === selectedBeverageId) ??
    BEVERAGE_TYPES[0];

  const visibleBeverages = useMemo(() => {
    const defaults = ["water", "coffee", "tea", "sports-drink", "milk"];
    return [...BEVERAGE_TYPES]
      .filter((beverage) => beverage.id !== "other")
      .sort((left, right) => {
        const usageDifference =
          (beverageUsage[right.id] ?? 0) - (beverageUsage[left.id] ?? 0);
        if (usageDifference !== 0) return usageDifference;
        return defaults.indexOf(left.id) - defaults.indexOf(right.id);
      })
      .slice(0, 5);
  }, [beverageUsage]);

  const overflowBeverages = useMemo(
    () =>
      BEVERAGE_TYPES.filter(
        (beverage) =>
          !visibleBeverages.some((visible) => visible.id === beverage.id)
      ),
    [visibleBeverages]
  );

  const quickAddOptions = useMemo<RememberedEntry[]>(() => {
    const defaults =
      preferredUnit === "ml"
        ? [250, 350, 500].map((quickAmount) => ({
            amount: quickAmount,
            unit: "ml" as const,
          }))
        : [8, 12, 16].map((quickAmount) => ({
            amount: quickAmount,
            unit: "oz" as const,
          }));

    return rememberedEntry ? [...defaults, rememberedEntry] : defaults;
  }, [preferredUnit, rememberedEntry]);

  const groupedEntries = useMemo(() => {
    const sortedEntries = [...entries].sort(
      (a, b) =>
        new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
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

    Promise.all([
      getProfile(),
      getHydrationEntries(),
      getDailyHydrationTotal(summaryDate),
    ])
      .then(([loadedProfile, hydrationEntries, total]) => {
        if (isCancelled) return;

        setProfile(loadedProfile);
        setUnit(loadedProfile.preferredHydrationUnit);
        setEntryTime(currentTimeInputValue(loadedProfile));
        setEntries(hydrationEntries);
        setDailyTotal(total);
      })
      .catch(() => {
        if (!isCancelled) setError("Unable to load hydration records.");
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [summaryDate]);

  const selectBeverage = (beverageId: string): void => {
    setSelectedBeverageId(beverageId);
    localStorage.setItem(LAST_BEVERAGE_KEY, beverageId);
  };

  const recordBeverageUse = (): void => {
    setBeverageUsage((current) => {
      const next = {
        ...current,
        [selectedBeverageId]: (current[selectedBeverageId] ?? 0) + 1,
      };
      localStorage.setItem(BEVERAGE_USAGE_KEY, JSON.stringify(next));
      localStorage.setItem(LAST_BEVERAGE_KEY, selectedBeverageId);
      return next;
    });
  };

  const saveEntry = async (
    entryAmount: number,
    entryUnit: HydrationUnit,
    rememberManualEntry = false
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

      recordBeverageUse();

      if (rememberManualEntry) {
        const nextRemembered = { amount: entryAmount, unit: entryUnit };
        localStorage.setItem(
          LAST_MANUAL_ENTRY_KEY,
          JSON.stringify(nextRemembered)
        );
        setRememberedEntry(nextRemembered);
      }

      setAmount("");
      setEntryTime(currentTimeInputValue(localizationPreferences));
      setSummaryDate(entryDate);
      setMessage(
        `${selectedBeverage.label}: ${entryAmount} ${entryUnit} added successfully.`
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

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a hydration amount greater than zero.");
      return;
    }

    await saveEntry(numericAmount, unit, true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm("Delete this hydration entry?")) return;

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
          <p>Record beverages that contribute to your daily hydration.</p>
        </div>
        <button type="button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      <section className="hydration-workspace">
        <article className="dashboard-card hydration-progress-card">
          <div className="hydration-card-heading">
            <div>
              <h2>Daily Progress</h2>
              <p>{dailyTotal?.entries.length ?? 0} {(dailyTotal?.entries.length ?? 0) === 1 ? "entry" : "entries"}</p>
            </div>
            <label className="hydration-date-filter">
              Select Date
              <input
                type="date"
                value={summaryDate}
                max={getLocalDateValue()}
                onChange={(event) => {
                  setIsLoading(true);
                  setError("");
                  setSummaryDate(event.target.value);
                }}
              />
            </label>
          </div>

          {isLoading ? (
            <p className="hydration-loading">Loading daily total...</p>
          ) : dailyTotal ? (
            <div
              className="hydration-gauge"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(goalProgress)}
            >
              <svg viewBox="0 0 360 300" aria-hidden="true">
                <defs>
                  <linearGradient id="hydrationArcGradient" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a3e635" />
                    <stop offset="38%" stopColor="#4ade80" />
                    <stop offset="72%" stopColor="#16a34a" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                  <filter id="hydrationArcGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  className="hydration-gauge-track"
                  cx="180"
                  cy="160"
                  r="116"
                  pathLength="100"
                  transform="rotate(135 180 160)"
                />
                <circle
                  className="hydration-gauge-progress"
                  cx="180"
                  cy="160"
                  r="116"
                  pathLength="100"
                  transform="rotate(135 180 160)"
                  style={{ strokeDasharray: `${progressArc} ${100 - progressArc}` }}
                />
                {[0, 25, 50, 75, 100].map((level) => {
                  const angle = (135 + (270 * level) / 100) * (Math.PI / 180);
                  const radius = 116;
                  const x = 180 + radius * Math.cos(angle);
                  const y = 160 + radius * Math.sin(angle);
                  return (
                    <circle
                      key={level}
                      className={level <= goalProgress ? "hydration-level hydration-level-active" : "hydration-level"}
                      cx={x}
                      cy={y}
                      r="5"
                    />
                  );
                })}
              </svg>

              <div className="hydration-gauge-content">
                <strong>{formatAmount(primaryTotal, preferredUnit)}</strong>
                <span className="hydration-gauge-unit">{preferredUnit}</span>
                <p>Goal: {formatAmount(goal, preferredUnit)} {preferredUnit}</p>
                <b>{Math.round(rawGoalProgress)}%</b>
              </div>

              <div className="hydration-level-label hydration-level-label-start">0%</div>
              <div className="hydration-level-label hydration-level-label-quarter">25%</div>
              <div className="hydration-level-label hydration-level-label-half">50%</div>
              <div className="hydration-level-label hydration-level-label-three-quarter">75%</div>
              <div className="hydration-level-label hydration-level-label-goal">100%</div>
            </div>
          ) : (
            <p>No hydration total is available.</p>
          )}
        </article>

        <article className="dashboard-card hydration-entry-card">
          <div className="hydration-card-heading">
            <div>
              <h2>Log Hydration</h2>
              <p>Record water or another beverage by volume.</p>
            </div>
          </div>

          <div className="beverage-selector-section">
            <span className="hydration-input-label">Beverage</span>
            <div className="beverage-selector-row" role="group" aria-label="Beverage type">
              {visibleBeverages.map((beverage) => (
                <button
                  key={beverage.id}
                  type="button"
                  className={
                    beverage.id === selectedBeverageId
                      ? "beverage-selector-button selected"
                      : "beverage-selector-button"
                  }
                  aria-pressed={beverage.id === selectedBeverageId}
                  onClick={() => selectBeverage(beverage.id)}
                >
                  <span aria-hidden="true">{beverage.icon}</span>
                  <small>{beverage.label}</small>
                </button>
              ))}

              <label className="beverage-more-control">
                <span aria-hidden="true">＋</span>
                <small>More</small>
                <select
                  aria-label="More beverages"
                  value={
                    overflowBeverages.some(
                      (beverage) => beverage.id === selectedBeverageId
                    )
                      ? selectedBeverageId
                      : ""
                  }
                  onChange={(event) => {
                    if (event.target.value) selectBeverage(event.target.value);
                  }}
                >
                  <option value="">Select beverage</option>
                  {overflowBeverages.map((beverage) => (
                    <option key={beverage.id} value={beverage.id}>
                      {beverage.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="quick-add-section">
            <div className="hydration-quick-add-heading">
              <span className="hydration-input-label">Quick Add</span>
              <p>
                Logging For {selectedBeverage.icon} {selectedBeverage.label} on {formatUserDate(new Date(`${entryDate}T12:00:00`), localizationPreferences)} at {entryTime}
              </p>
            </div>
            <div className="quick-add-buttons">
              {quickAddOptions.map((option, index) => {
                const isRemembered =
                  rememberedEntry !== null &&
                  index === quickAddOptions.length - 1 &&
                  option.amount === rememberedEntry.amount &&
                  option.unit === rememberedEntry.unit;

                return (
                  <button
                    key={`${option.amount}-${option.unit}-${index}`}
                    type="button"
                    className="quick-add-button"
                    disabled={isSaving}
                    title={isRemembered ? "Last manually entered amount" : undefined}
                    onClick={() => saveEntry(option.amount, option.unit)}
                  >
                    <span>{isRemembered ? "★" : "+"}</span>
                    {option.amount} {option.unit}
                  </button>
                );
              })}
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
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>

              <label>
                Unit
                <select
                  value={unit}
                  onChange={(event) => setUnit(event.target.value as HydrationUnit)}
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
                  onChange={(event) => setEntryDate(event.target.value)}
                />
              </label>

              <label>
                Entry Time
                <LocalizedTimeInput
                  required
                  value={entryTime}
                  timeFormat={localizationPreferences.preferredTimeFormat}
                  onChange={setEntryTime}
                />
              </label>
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}

            <div className="hydration-form-actions">
              <button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Hydration Entry"}
              </button>
              {showAddAnother && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setMessage("");
                    setShowAddAnother(false);
                    setEntryTime(currentTimeInputValue(localizationPreferences));
                    amountInputRef.current?.focus();
                  }}
                >
                  Add Another
                </button>
              )}
            </div>
          </form>
        </article>
      </section>

      <section className="dashboard-card hydration-history-card">
        <div className="hydration-card-heading">
          <div>
            <h2>Hydration History</h2>
            <p>{entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
          </div>
        </div>
        {isLoading ? (
          <p>Loading hydration history...</p>
        ) : entries.length === 0 ? (
          <p>No hydration entries have been recorded yet.</p>
        ) : (
          <div className="hydration-history">
            {Object.entries(groupedEntries).map(([dateKey, dateEntries]) => (
              <section key={dateKey} className="hydration-date-group">
                <h3>{getDateGroupLabel(dateKey, localizationPreferences)}</h3>
                <div className="hydration-date-group-items">
                  {dateEntries.map((entry) => (
                    <article key={entry.id} className="history-item hydration-history-item">
                      <div>
                        <strong>{entry.amount} {entry.unit}</strong>
                        <p>{formatUserTime(entry.loggedAt, localizationPreferences)}</p>
                      </div>
                      <button
                        type="button"
                        className="delete-button"
                        disabled={deletingId === entry.id}
                        onClick={() => handleDelete(entry.id)}
                      >
                        {deletingId === entry.id ? "Deleting..." : "Delete"}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
