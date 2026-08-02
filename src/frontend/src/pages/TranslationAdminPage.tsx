import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import {
  getTranslations,
  saveTranslation,
  type TranslationKeyRecord,
  type TranslationStatus,
} from "../services/translationAdminService";
import "./Admin.css";

function portugueseValue(item: TranslationKeyRecord) {
  return item.translations.find((value) => value.language.locale === "pt-BR");
}

type SortField = "key" | "category" | "status" | "updatedAt";
type SortDirection = "asc" | "desc";

export default function TranslationAdminPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TranslationKeyRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<TranslationStatus | "">("");
  const [sortField, setSortField] = useState<SortField>("key");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
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
              result.translations.map((item) => [
                item.id,
                portugueseValue(item)?.value ?? "",
              ])
            )
          );
          setError("");
        })
        .catch(() => setError("Unable to load translations."))
        .finally(() => setLoading(false));
    }, 200);

    return () => window.clearTimeout(timer);
  }, [search, category, status]);

  const missingCount = useMemo(
    () => items.filter((item) => !portugueseValue(item)?.value.trim()).length,
    [items]
  );

  const sortedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      const leftTranslation = portugueseValue(left);
      const rightTranslation = portugueseValue(right);

      let leftValue = "";
      let rightValue = "";

      if (sortField === "key") {
        leftValue = left.key;
        rightValue = right.key;
      } else if (sortField === "category") {
        leftValue = left.category;
        rightValue = right.category;
      } else if (sortField === "status") {
        leftValue = leftTranslation?.status ?? "MISSING";
        rightValue = rightTranslation?.status ?? "MISSING";
      } else {
        leftValue = leftTranslation?.updatedAt ?? "";
        rightValue = rightTranslation?.updatedAt ?? "";
      }

      const comparison = leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
        sensitivity: "base",
      });

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [items, sortDirection, sortField]);

  function changeSort(nextField: SortField) {
    if (nextField === sortField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(nextField);
    setSortDirection("asc");
  }

  function sortIndicator(field: SortField) {
    if (field !== sortField) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

  async function persist(
    item: TranslationKeyRecord,
    nextStatus: TranslationStatus
  ) {
    const value = drafts[item.id]?.trim() ?? "";
    if (!value) {
      setError("Enter a Portuguese translation before saving.");
      return;
    }

    setBusyKey(item.id);
    setError("");
    setMessage("");

    try {
      const saved = await saveTranslation(
        item.id,
        "pt-BR",
        value,
        nextStatus
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

      setMessage(
        nextStatus === "PUBLISHED"
          ? "Translation published successfully."
          : "Translation draft saved successfully."
      );
    } catch {
      setError("Unable to save the translation.");
    } finally {
      setBusyKey(null);
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
            English is the canonical source. Edit Portuguese drafts, review
            them, and publish approved wording.
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => navigate("/admin")}
        >
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
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
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
            onChange={(event) =>
              setStatus(event.target.value as TranslationStatus | "")
            }
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>
        <div className="translation-summary">
          <strong>{items.length}</strong>
          <span>keys</span>
          <strong>{missingCount}</strong>
          <span>missing</span>
        </div>
      </section>

      {message && <p className="form-message success-message">{message}</p>}
      {error && <p className="form-message error-message">{error}</p>}

      {loading ? (
        <p className="admin-loading">Loading translation catalog...</p>
      ) : (
        <section className="translation-table-card">
          <div className="translation-table-scroll">
            <table className="translation-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" onClick={() => changeSort("key")}>
                      Key{sortIndicator("key")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      onClick={() => changeSort("category")}
                    >
                      Category{sortIndicator("category")}
                    </button>
                  </th>
                  <th>English</th>
                  <th>Português (Brasil)</th>
                  <th>
                    <button
                      type="button"
                      onClick={() => changeSort("status")}
                    >
                      Status{sortIndicator("status")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      onClick={() => changeSort("updatedAt")}
                    >
                      Updated{sortIndicator("updatedAt")}
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const current = portugueseValue(item);
                  const changed =
                    (drafts[item.id] ?? "") !== (current?.value ?? "");
                  const currentStatus = current?.status ?? "MISSING";

                  return (
                    <tr key={item.id} className={changed ? "has-changes" : ""}>
                      <td className="translation-key-cell">
                        <code>{item.key}</code>
                      </td>
                      <td>
                        <span className="translation-category">
                          {item.category}
                        </span>
                      </td>
                      <td className="translation-source-cell">
                        {item.sourceText}
                      </td>
                      <td className="translation-editor-cell">
                        <textarea
                          aria-label={`Portuguese translation for ${item.key}`}
                          value={drafts[item.id] ?? ""}
                          onChange={(event) =>
                            setDrafts((values) => ({
                              ...values,
                              [item.id]: event.target.value,
                            }))
                          }
                          rows={2}
                        />
                        {changed && (
                          <span className="unsaved-indicator">
                            Unsaved changes
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`translation-status ${currentStatus.toLowerCase()}`}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td className="translation-updated-cell">
                        {current?.updatedAt
                          ? new Date(current.updatedAt).toLocaleString()
                          : "Not yet translated"}
                      </td>
                      <td>
                        <div className="translation-table-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={busyKey === item.id || !changed}
                            onClick={() => void persist(item, "DRAFT")}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            disabled={busyKey === item.id}
                            onClick={() => void persist(item, "PUBLISHED")}
                          >
                            Publish
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!sortedItems.length && (
            <div className="admin-empty">
              <h2>No translations found</h2>
              <p>Adjust the search or filters.</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
