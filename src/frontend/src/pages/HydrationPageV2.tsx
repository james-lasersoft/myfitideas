import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import HydrationProgressVisualization from "../components/HydrationProgressVisualization";
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
import { currentTimeInputValue, formatUserDate, formatUserTime, type LocalizationPreferences } from "../utils/localizationFormat";
import "./HydrationPage.css";
import "./HydrationEntryLayout.css";
import "./HydrationProgressVisualization.css";

const LAST_MANUAL_ENTRY_KEY = "lastManualHydrationEntry";
const LAST_BEVERAGE_KEY = "lastHydrationBeverage";
const BEVERAGE_USAGE_KEY = "hydrationBeverageUsage";
const ML_PER_OUNCE = 29.5735;
const FALLBACK_PREFERENCES: LocalizationPreferences = {
  preferredLanguage: "en",
  preferredDateFormat: "LOCALE",
  preferredTimeFormat: "12",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

type RememberedEntry = { amount: number; unit: HydrationUnit };
type BeverageType = { id: string; label: string; icon: string; coefficient: number };

const BEVERAGES: BeverageType[] = [
  { id: "water", label: "Water", icon: "💧", coefficient: 1 },
  { id: "coffee", label: "Coffee", icon: "☕", coefficient: 0.95 },
  { id: "tea", label: "Tea", icon: "🍵", coefficient: 0.98 },
  { id: "sports-drink", label: "Sports Drink", icon: "⚡", coefficient: 0.95 },
  { id: "milk", label: "Milk", icon: "🥛", coefficient: 0.9 },
  { id: "juice", label: "Juice", icon: "🧃", coefficient: 0.85 },
  { id: "soda", label: "Soda", icon: "🥤", coefficient: 0.8 },
  { id: "sparkling-water", label: "Sparkling Water", icon: "🫧", coefficient: 1 },
  { id: "energy-drink", label: "Energy Drink", icon: "🔋", coefficient: 0.8 },
  { id: "smoothie", label: "Smoothie", icon: "🥭", coefficient: 0.85 },
  { id: "oral-rehydration", label: "Oral Rehydration Drink", icon: "🧂", coefficient: 1 },
  { id: "other", label: "Other Beverage", icon: "⋯", coefficient: 0.8 },
];

function localDateValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function loggedAtValue(dateValue: string, timeValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid hydration date or time.");
  return date.toISOString();
}

function rememberedEntry(): RememberedEntry | null {
  try {
    const value = JSON.parse(localStorage.getItem(LAST_MANUAL_ENTRY_KEY) ?? "null") as Partial<RememberedEntry> | null;
    if (!value || typeof value.amount !== "number" || value.amount <= 0 || (value.unit !== "oz" && value.unit !== "ml")) return null;
    return { amount: value.amount, unit: value.unit };
  } catch {
    return null;
  }
}

function initialBeverage(): string {
  const saved = localStorage.getItem(LAST_BEVERAGE_KEY);
  return BEVERAGES.some((item) => item.id === saved) ? saved ?? "water" : "water";
}

function beverageUsage(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEVERAGE_USAGE_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function beverageForEntry(entry: HydrationEntry): BeverageType {
  return BEVERAGES.find((item) => item.id === entry.beverageType) ?? BEVERAGES[0];
}

function amountFromMl(amountMl: number, unit: HydrationUnit): number {
  return unit === "ml" ? amountMl : amountMl / ML_PER_OUNCE;
}

function formatHydrationAmount(value: number, unit: HydrationUnit): string {
  return unit === "ml" ? value.toFixed(0) : value.toFixed(1);
}

export default function HydrationPageV2() {
  const navigate = useNavigate();
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<HydrationEntry[]>([]);
  const [dailyTotal, setDailyTotal] = useState<DailyHydrationTotal | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [remembered, setRemembered] = useState<RememberedEntry | null>(rememberedEntry);
  const [selectedBeverageId, setSelectedBeverageId] = useState(initialBeverage);
  const [usage, setUsage] = useState<Record<string, number>>(beverageUsage);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<HydrationUnit>("oz");
  const [summaryDate, setSummaryDate] = useState(localDateValue());
  const [entryDate, setEntryDate] = useState(localDateValue());
  const [entryTime, setEntryTime] = useState(currentTimeInputValue());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const preferences = profile ?? FALLBACK_PREFERENCES;
  const preferredUnit = profile?.preferredHydrationUnit ?? "oz";
  const goal = profile?.dailyHydrationGoal ?? 0;
  const primaryTotal = preferredUnit === "ml" ? dailyTotal?.totalMl ?? 0 : dailyTotal?.totalOz ?? 0;
  const selectedBeverage = BEVERAGES.find((item) => item.id === selectedBeverageId) ?? BEVERAGES[0];
  const selectedCoefficientPercent = Math.round(selectedBeverage.coefficient * 100);
  const selectedEntryCount = useMemo(
    () => entries.filter((entry) => localDateValue(new Date(entry.loggedAt)) === summaryDate).length,
    [entries, summaryDate]
  );

  const visibleBeverages = useMemo(() => {
    const defaults = ["water", "coffee", "tea", "sports-drink", "milk"];
    return [...BEVERAGES]
      .filter((item) => item.id !== "other")
      .sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0) || defaults.indexOf(a.id) - defaults.indexOf(b.id))
      .slice(0, 5);
  }, [usage]);

  const overflowBeverages = useMemo(
    () => BEVERAGES.filter((item) => !visibleBeverages.some((visible) => visible.id === item.id)),
    [visibleBeverages]
  );
  const selectedOverflow = overflowBeverages.find((item) => item.id === selectedBeverageId) ?? null;

  const quickAdds = useMemo<RememberedEntry[]>(() => {
    const defaults = preferredUnit === "ml"
      ? [250, 350, 500].map((value) => ({ amount: value, unit: "ml" as const }))
      : [8, 12, 16].map((value) => ({ amount: value, unit: "oz" as const }));
    return remembered ? [...defaults, remembered] : defaults;
  }, [preferredUnit, remembered]);

  const groupedEntries = useMemo(() => [...entries]
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
    .reduce<Record<string, HydrationEntry[]>>((groups, entry) => {
      const key = localDateValue(new Date(entry.loggedAt));
      groups[key] ??= [];
      groups[key].push(entry);
      return groups;
    }, {}), [entries]);

  const loadData = useCallback(async (date = summaryDate) => {
    const [allEntries, total] = await Promise.all([getHydrationEntries(), getDailyHydrationTotal(date)]);
    setEntries(allEntries);
    setDailyTotal(total);
  }, [summaryDate]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getProfile(), getHydrationEntries(), getDailyHydrationTotal(summaryDate)])
      .then(([loadedProfile, allEntries, total]) => {
        if (cancelled) return;
        setProfile(loadedProfile);
        setUnit(loadedProfile.preferredHydrationUnit);
        setEntryTime(currentTimeInputValue(loadedProfile));
        setEntries(allEntries);
        setDailyTotal(total);
      })
      .catch(() => !cancelled && setError("Unable to load hydration records."))
      .finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
  }, [summaryDate]);

  const selectBeverage = (id: string) => {
    setSelectedBeverageId(id);
    localStorage.setItem(LAST_BEVERAGE_KEY, id);
  };

  const saveEntry = async (entryAmount: number, entryUnit: HydrationUnit, remember = false) => {
    if (!entryDate || !entryTime) {
      setError("Select both an entry date and time.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      await createHydrationEntry({ amount: entryAmount, unit: entryUnit, beverageType: selectedBeverageId, loggedAt: loggedAtValue(entryDate, entryTime) });
      const nextUsage = { ...usage, [selectedBeverageId]: (usage[selectedBeverageId] ?? 0) + 1 };
      setUsage(nextUsage);
      localStorage.setItem(BEVERAGE_USAGE_KEY, JSON.stringify(nextUsage));
      localStorage.setItem(LAST_BEVERAGE_KEY, selectedBeverageId);
      if (remember) {
        const nextRemembered = { amount: entryAmount, unit: entryUnit };
        setRemembered(nextRemembered);
        localStorage.setItem(LAST_MANUAL_ENTRY_KEY, JSON.stringify(nextRemembered));
      }
      setAmount("");
      setEntryTime(currentTimeInputValue(preferences));
      setSummaryDate(entryDate);
      setMessage(`${selectedBeverage.label}: ${entryAmount} ${entryUnit} added successfully.`);
      await loadData(entryDate);
    } catch {
      setError("Unable to save hydration entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const submitManual = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a hydration amount greater than zero.");
      return;
    }
    await saveEntry(value, unit, true);
  };

  const deleteEntry = async (id: string) => {
    if (!window.confirm("Delete this hydration entry?")) return;
    setDeletingId(id);
    setMessage("");
    setError("");
    try {
      await deleteHydrationEntry(id);
      setMessage("Hydration entry deleted successfully.");
      await loadData();
    } catch {
      setError("Unable to delete hydration entry.");
    } finally {
      setDeletingId(null);
    }
  };

  const dateGroupLabel = (key: string) => {
    const today = localDateValue();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    if (key === today) return "Today";
    if (key === localDateValue(yesterdayDate)) return "Yesterday";
    const [year, month, day] = key.split("-").map(Number);
    return formatUserDate(new Date(year, month - 1, day), preferences);
  };

  return (
    <main className="dashboard-page hydration-page">
      <header className="dashboard-header">
        <div><h1>Hydration Tracking</h1><p>Record beverages that contribute to your daily hydration.</p></div>
        <button type="button" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
      </header>

      <section className="hydration-workspace">
        <article className="dashboard-card hydration-progress-card">
          <div className="hydration-card-heading">
            <div><h2>Daily Progress</h2><p>{selectedEntryCount} {selectedEntryCount === 1 ? "entry" : "entries"}</p></div>
            <label className="hydration-date-filter">Select Date<input type="date" value={summaryDate} max={localDateValue()} onChange={(event) => { setIsLoading(true); setError(""); setSummaryDate(event.target.value); }} /></label>
          </div>
          {isLoading ? <p className="hydration-loading">Loading daily total...</p> : dailyTotal ? (
            <HydrationProgressVisualization entries={entries} goal={goal} preferredUnit={preferredUnit} selectedDate={summaryDate} dailyTotal={primaryTotal} />
          ) : <p>No hydration total is available.</p>}
        </article>

        <article className="dashboard-card hydration-entry-card">
          <div className="hydration-card-heading"><div><h2>Log Hydration</h2></div></div>
          <div className="beverage-selector-section">
            <span className="hydration-input-label">Beverage</span>
            <div className="beverage-selector-row" role="group" aria-label="Beverage type">
              {visibleBeverages.map((beverage) => <button key={beverage.id} type="button" className={beverage.id === selectedBeverageId ? "beverage-selector-button selected" : "beverage-selector-button"} aria-pressed={beverage.id === selectedBeverageId} onClick={() => selectBeverage(beverage.id)}><span aria-hidden="true">{beverage.icon}</span><small>{beverage.label}</small></button>)}
              <label className={selectedOverflow ? "beverage-more-control selected" : "beverage-more-control"}>
                <span aria-hidden="true">{selectedOverflow?.icon ?? "＋"}</span><small>{selectedOverflow?.label ?? "More"}</small>
                <select aria-label="More beverages" value={selectedOverflow?.id ?? ""} onChange={(event) => event.target.value && selectBeverage(event.target.value)}><option value="">Select beverage</option>{overflowBeverages.map((beverage) => <option key={beverage.id} value={beverage.id}>{beverage.label}</option>)}</select>
              </label>
            </div>
          </div>

          <div className="quick-add-section">
            <div className="hydration-quick-add-heading"><span className="hydration-input-label">Quick Add</span></div>
            <div className="quick-add-buttons">{quickAdds.map((option, index) => {
              const isRemembered = remembered !== null && index === quickAdds.length - 1 && option.amount === remembered.amount && option.unit === remembered.unit;
              return <button key={`${option.amount}-${option.unit}-${index}`} type="button" className="quick-add-button" disabled={isSaving} title={`${selectedCoefficientPercent}%`} aria-label={`${option.amount} ${option.unit}, ${selectedCoefficientPercent}%`} onClick={() => saveEntry(option.amount, option.unit)}><span>{isRemembered ? "★" : "+"}</span>{option.amount} {option.unit}</button>;
            })}</div>
          </div>

          <form className="hydration-form" onSubmit={submitManual}>
            <div className="hydration-form-grid">
              <label>Amount<input ref={amountInputRef} type="number" min="0.1" step="0.1" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
              <label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value as HydrationUnit)}><option value="oz">Ounces</option><option value="ml">Milliliters</option></select></label>
              <label>Entry Date<input type="date" required value={entryDate} max={localDateValue()} onChange={(event) => setEntryDate(event.target.value)} /></label>
              <label>Entry Time<LocalizedTimeInput required value={entryTime} timeFormat={preferences.preferredTimeFormat} onChange={setEntryTime} /></label>
            </div>
            <div className="hydration-entry-status" aria-live="polite">{message ? <p className="success-message">{message}</p> : error ? <p className="error-message">{error}</p> : null}</div>
            <div className="hydration-form-actions"><button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Hydration Entry"}</button></div>
          </form>
        </article>
      </section>

      <section className="dashboard-card hydration-history-card">
        <div className="hydration-card-heading"><div><h2>Hydration History</h2><p>{entries.length} {entries.length === 1 ? "entry" : "entries"}</p></div></div>
        {isLoading ? <p>Loading hydration history...</p> : entries.length === 0 ? <p>No hydration entries have been recorded yet.</p> : (
          <div className="hydration-history">{Object.entries(groupedEntries).map(([key, dayEntries]) => (
            <section key={key} className="hydration-date-group">
              <h3>{dateGroupLabel(key)}</h3>
              <div className="hydration-date-group-items">{dayEntries.map((entry) => {
                const beverage = beverageForEntry(entry);
                const coefficient = entry.hydrationCoefficient ?? 1;
                const effectiveMl = entry.effectiveAmountMl ?? entry.amountMl;
                const effectiveAmount = amountFromMl(effectiveMl, entry.unit);
                return (
                  <article key={entry.id} className="history-item hydration-history-item">
                    <div className="hydration-history-main">
                      <span className="hydration-history-beverage" aria-hidden="true">{beverage.icon}</span>
                      <div className="hydration-history-identity"><strong>{beverage.label}</strong><p>{formatUserTime(entry.loggedAt, preferences)}</p></div>
                      <div className="hydration-history-metric"><small>Consumed</small><strong>{entry.amount} {entry.unit}</strong></div>
                      <div className="hydration-history-metric"><small>Coefficient</small><strong>{Math.round(coefficient * 100)}%</strong></div>
                      <div className="hydration-history-metric hydration-history-effective"><small>Effective</small><strong>{formatHydrationAmount(effectiveAmount, entry.unit)} {entry.unit}</strong></div>
                    </div>
                    <button type="button" className="delete-button" disabled={deletingId === entry.id} onClick={() => deleteEntry(entry.id)}>{deletingId === entry.id ? "Deleting..." : "Delete"}</button>
                  </article>
                );
              })}</div>
            </section>
          ))}</div>
        )}
      </section>
    </main>
  );
}
