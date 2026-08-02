import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Tooltip from "../components/Tooltip";
import { useLocale } from "../i18n/LocaleContext";
import {
  getTranslationHistory,
  getTranslations,
  saveTranslation,
  updateSourceText,
  type TranslationHistoryRecord,
  type TranslationKeyRecord,
  type TranslationStatus,
} from "../services/translationAdminService";
import "./Admin.css";

type SortField = "key" | "source" | "target" | "category" | "status" | "updated";
type SortDirection = "asc" | "desc";
const PAGE_SIZE = 25;

function portugueseValue(item: TranslationKeyRecord) {
  return item.translations.find((value) => value.language.locale === "pt-BR");
}

function statusLabel(item: TranslationKeyRecord): TranslationStatus | "MISSING" {
  return portugueseValue(item)?.status ?? "MISSING";
}

export default function TranslationAdminPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [items, setItems] = useState<TranslationKeyRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<TranslationStatus | "">("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("key");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [historyItem, setHistoryItem] = useState<TranslationKeyRecord | null>(null);
  const [history, setHistory] = useState<TranslationHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      getTranslations({ search, category, status })
        .then((result) => {
          setItems(result.translations);
          setCategories(result.categories);
          setDrafts(
            Object.fromEntries(
              result.translations.map((item) => [item.id, portugueseValue(item)?.value ?? ""])
            )
          );
          setSelectedIds(new Set());
          setPage(1);
          setError("");
        })
        .catch(() => setError(t("Unable to load translations.")))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search, category, status, t]);

  const filteredItems = useMemo(() => {
    const filtered = missingOnly
      ? items.filter((item) => !(portugueseValue(item)?.value ?? "").trim())
      : items;

    return [...filtered].sort((left, right) => {
      const leftTranslation = portugueseValue(left);
      const rightTranslation = portugueseValue(right);
      const comparison = (() => {
        switch (sortField) {
          case "source":
            return left.sourceText.localeCompare(right.sourceText);
          case "target":
            return (leftTranslation?.value ?? "").localeCompare(rightTranslation?.value ?? "");
          case "category":
            return left.category.localeCompare(right.category);
          case "status":
            return statusLabel(left).localeCompare(statusLabel(right));
          case "updated":
            return (
              new Date(leftTranslation?.updatedAt ?? 0).getTime() -
              new Date(rightTranslation?.updatedAt ?? 0).getTime()
            );
          case "key":
          default:
            return left.key.localeCompare(right.key);
        }
      })();
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [items, missingOnly, sortDirection, sortField]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), pageCount));
  }, [pageCount]);

  const pageStart = filteredItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, filteredItems.length);
  const pageItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const missingCount = items.filter((item) => !(portugueseValue(item)?.value ?? "").trim()).length;
  const allVisibleSelected =
    pageItems.length > 0 && pageItems.every((item) => selectedIds.has(item.id));

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageSelection() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) pageItems.forEach((item) => next.delete(item.id));
      else pageItems.forEach((item) => next.add(item.id));
      return next;
    });
  }

  async function editEnglishSource(item: TranslationKeyRecord) {
    const nextSource = window.prompt(t("Edit English source text"), item.sourceText)?.trim();
    if (!nextSource || nextSource === item.sourceText) return;
    setBusyKey(item.id);
    setError("");
    setMessage("");
    try {
      const updated = await updateSourceText(item.id, nextSource);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                sourceText: updated.sourceText,
                translations: entry.translations.map((value) =>
                  value.language.isSource ? value : { ...value, status: "DRAFT" }
                ),
              }
            : entry
        )
      );
      setMessage(t("English source updated. Existing translations require review."));
    } catch {
      setError(t("Unable to update the English source."));
    } finally {
      setBusyKey(null);
    }
  }

  async function persist(item: TranslationKeyRecord, nextStatus: TranslationStatus) {
    const value = drafts[item.id]?.trim() ?? "";
    if (!value) {
      setError(t("Enter a Portuguese translation before saving."));
      return;
    }
    setBusyKey(item.id);
    setError("");
    setMessage("");
    try {
      const saved = await saveTranslation(item.id, "pt-BR", value, nextStatus);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                translations: [
                  ...entry.translations.filter(
                    (translation) => translation.language.locale !== "pt-BR"
                  ),
                  saved,
                ],
              }
            : entry
        )
      );
      setEditingId(null);
      setMessage(
        t(
          nextStatus === "PUBLISHED"
            ? "Translation published successfully."
            : "Translation draft saved successfully."
        )
      );
    } catch {
      setError(t("Unable to save the translation."));
    } finally {
      setBusyKey(null);
    }
  }

  async function publishSelected() {
    const selected = items.filter((item) => selectedIds.has(item.id));
    const publishable = selected.filter((item) => (drafts[item.id] ?? "").trim());
    if (!publishable.length) {
      setError(t("Select at least one row with a Portuguese translation."));
      return;
    }
    setBulkBusy(true);
    setError("");
    setMessage("");
    try {
      for (const item of publishable) {
        const saved = await saveTranslation(
          item.id,
          "pt-BR",
          drafts[item.id].trim(),
          "PUBLISHED"
        );
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  translations: [
                    ...entry.translations.filter(
                      (translation) => translation.language.locale !== "pt-BR"
                    ),
                    saved,
                  ],
                }
              : entry
          )
        );
      }
      setSelectedIds(new Set());
      setMessage(t("Selected translations published successfully."));
    } catch {
      setError(t("Unable to publish all selected translations."));
    } finally {
      setBulkBusy(false);
    }
  }

  async function openHistory(item: TranslationKeyRecord) {
    setHistoryItem(item);
    setHistory([]);
    setHistoryLoading(true);
    try {
      setHistory(await getTranslationHistory(item.id));
    } catch {
      setError(t("Unable to load translation history."));
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <main className="admin-page translation-admin-page">
      <header className="admin-header compact">
        <div>
          <BrandLogo className="admin-logo" />
          <p className="admin-eyebrow">Administration / Translations</p>
          <h1>Translation Management</h1>
          <p>
            English is the canonical source. Edit Portuguese drafts, review them, and publish
            approved wording.
          </p>
        </div>
        <button className="secondary-button" onClick={() => navigate("/admin")}>
          Back to Admin
        </button>
      </header>

      <section className="translation-toolbar">
        <label>
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Key or text"
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as TranslationStatus | "")}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>
        <label className="translation-check">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(event) => {
              setMissingOnly(event.target.checked);
              setPage(1);
            }}
          />
          Missing only
        </label>
        <div className="translation-summary">
          <strong>{filteredItems.length}</strong>
          <span>keys</span>
          <strong>{missingCount}</strong>
          <span>missing</span>
        </div>
      </section>

      <section className="translation-bulk-bar">
        <span>{selectedIds.size} selected</span>
        <Tooltip content={t("Publish all selected translations")}>
          <button
            type="button"
            disabled={!selectedIds.size || bulkBusy}
            onClick={() => void publishSelected()}
          >
            {bulkBusy ? "Publishing..." : "Publish selected"}
          </button>
        </Tooltip>
      </section>

      {message && <p className="form-message success-message">{message}</p>}
      {error && <p className="form-message error-message">{error}</p>}

      {loading ? (
        <p className="admin-loading">Loading translation catalog...</p>
      ) : (
        <section className="translation-table-wrap">
          <table className="translation-table">
            <thead>
              <tr>
                <th>
                  <input
                    aria-label="Select visible rows"
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={togglePageSelection}
                  />
                </th>
                <th>Status</th>
                <th>
                  <button type="button" onClick={() => toggleSort("key")}>
                    Key
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("source")}>
                    English
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("target")}>
                    Portuguese
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("category")}>
                    Category
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("updated")}>
                    Updated
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => {
                const current = portugueseValue(item);
                const changed = (drafts[item.id] ?? "") !== (current?.value ?? "");
                const rowStatus = statusLabel(item);
                const isEditing = editingId === item.id;
                const statusHelp =
                  rowStatus === "PUBLISHED"
                    ? "Published and visible in the application"
                    : rowStatus === "REVIEWED"
                      ? "Reviewed and awaiting publication"
                      : rowStatus === "DRAFT"
                        ? "Draft or source changed; review required"
                        : "Translation is missing";

                return (
                  <tr
                    key={item.id}
                    className={changed ? "translation-row-unsaved" : undefined}
                  >
                    <td>
                      <input
                        aria-label={`Select ${item.key}`}
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelected(item.id)}
                      />
                    </td>
                    <td>
                      <Tooltip content={t(statusHelp)}>
                        <span className={`translation-dot ${rowStatus.toLowerCase()}`}>●</span>
                      </Tooltip>
                      <span className="sr-only">{rowStatus}</span>
                    </td>
                    <td>
                      <code>{item.key}</code>
                    </td>
                    <td data-no-translate="true">
                      <button
                        type="button"
                        className="translation-text-button"
                        disabled={busyKey === item.id}
                        onClick={() => void editEnglishSource(item)}
                      >
                        {item.sourceText}
                      </button>
                    </td>
                    <td className="translation-target-cell">
                      {isEditing ? (
                        <textarea
                          autoFocus
                          value={drafts[item.id] ?? ""}
                          onChange={(event) =>
                            setDrafts((values) => ({ ...values, [item.id]: event.target.value }))
                          }
                          rows={2}
                        />
                      ) : (
                        <button
                          type="button"
                          className="translation-text-button"
                          onClick={() => setEditingId(item.id)}
                        >
                          {drafts[item.id]?.trim() || "Missing translation"}
                        </button>
                      )}
                    </td>
                    <td>
                      <span className="category-pill">{item.category}</span>
                    </td>
                    <td>
                      {current?.updatedAt ? new Date(current.updatedAt).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <div className="translation-row-actions">
                        {isEditing ? (
                          <>
                            <Tooltip content={t("Save translation as a draft")}>
                              <button
                                type="button"
                                className="secondary-button"
                                disabled={busyKey === item.id || !changed}
                                onClick={() => void persist(item, "DRAFT")}
                              >
                                Save
                              </button>
                            </Tooltip>
                            <Tooltip content={t("Publish this translation")}>
                              <button
                                type="button"
                                disabled={busyKey === item.id}
                                onClick={() => void persist(item, "PUBLISHED")}
                              >
                                Publish
                              </button>
                            </Tooltip>
                            <Tooltip content={t("Discard unsaved changes")}>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => {
                                  setDrafts((values) => ({
                                    ...values,
                                    [item.id]: current?.value ?? "",
                                  }));
                                  setEditingId(null);
                                }}
                                aria-label={t("Cancel editing")}
                              >
                                ×
                              </button>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip content={t("Edit Portuguese translation")}>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => setEditingId(item.id)}
                                aria-label={t(`Edit ${item.key}`)}
                              >
                                ✎
                              </button>
                            </Tooltip>
                            <Tooltip content={t("View translation history")}>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => void openHistory(item)}
                                aria-label={t(`View history for ${item.key}`)}
                              >
                                ◷
                              </button>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!pageItems.length && (
            <div className="admin-empty">
              <h2>No translations found</h2>
              <p>Adjust the search or filters.</p>
            </div>
          )}
        </section>
      )}

      <nav className="translation-pagination" aria-label="Translation pages">
        <button
          type="button"
          className="secondary-button"
          disabled={page === 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          Previous
        </button>
        <span>
          {pageStart}-{pageEnd} of {filteredItems.length} · Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="secondary-button"
          disabled={page === pageCount}
          onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
        >
          Next
        </button>
      </nav>

      {historyItem && (
        <div className="translation-drawer-backdrop" onClick={() => setHistoryItem(null)}>
          <aside
            className="translation-drawer"
            onClick={(event) => event.stopPropagation()}
            aria-label="Translation history"
          >
            <div className="translation-drawer-header">
              <div>
                <p className="admin-eyebrow">Translation history</p>
                <h2>{historyItem.key}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setHistoryItem(null)}
                aria-label={t("Close history")}
              >
                ×
              </button>
            </div>
            <section>
              <h3>English source</h3>
              <p data-no-translate="true">{historyItem.sourceText}</p>
            </section>
            <section>
              <h3>Portuguese</h3>
              <p>{drafts[historyItem.id] || "No translation yet"}</p>
            </section>
            <section>
              <h3>History</h3>
              {historyLoading ? (
                <p>Loading history...</p>
              ) : history.length ? (
                <ol className="translation-history-list">
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <strong>{entry.action.replaceAll("_", " ")}</strong>
                      <span>
                        {entry.languageLocale} · {entry.newStatus}
                      </span>
                      <p>{entry.newValue}</p>
                      <small>
                        {new Date(entry.changedAt).toLocaleString()} · {entry.changedBy.firstName}{" "}
                        {entry.changedBy.lastName ?? ""}
                      </small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No history recorded yet.</p>
              )}
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
