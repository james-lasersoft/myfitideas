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

export default function TranslationAdminPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TranslationKeyRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<TranslationStatus | "">("");
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
          setDrafts(Object.fromEntries(result.translations.map((item) => [item.id, portugueseValue(item)?.value ?? ""])));
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

  async function persist(item: TranslationKeyRecord, nextStatus: TranslationStatus) {
    const value = drafts[item.id]?.trim() ?? "";
    if (!value) {
      setError("Enter a Portuguese translation before saving.");
      return;
    }

    setBusyKey(item.id);
    setError("");
    setMessage("");
    try {
      const saved = await saveTranslation(item.id, "pt-BR", value, nextStatus);
      setItems((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, translations: [...entry.translations.filter((translation) => translation.language.locale !== "pt-BR"), saved] }
        : entry));
      setMessage(nextStatus === "PUBLISHED" ? "Translation published successfully." : "Translation draft saved successfully.");
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
          <p>English is the canonical source. Edit Portuguese drafts, review them, and publish approved wording.</p>
        </div>
        <button className="secondary-button" onClick={() => navigate("/admin")}>Back to Admin</button>
      </header>

      <section className="translation-toolbar">
        <label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Key or text" /></label>
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as TranslationStatus | "")}><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="REVIEWED">Reviewed</option><option value="PUBLISHED">Published</option></select></label>
        <div className="translation-summary"><strong>{items.length}</strong><span>keys</span><strong>{missingCount}</strong><span>missing</span></div>
      </section>

      {message && <p className="form-message success-message">{message}</p>}
      {error && <p className="form-message error-message">{error}</p>}

      {loading ? <p className="admin-loading">Loading translation catalog...</p> : (
        <section className="translation-list">
          {items.map((item) => {
            const current = portugueseValue(item);
            const changed = (drafts[item.id] ?? "") !== (current?.value ?? "");
            return (
              <article className="translation-row" key={item.id}>
                <div className="translation-meta">
                  <code>{item.key}</code>
                  <span>{item.category}</span>
                  <span className={`translation-status ${(current?.status ?? "DRAFT").toLowerCase()}`}>{current?.status ?? "MISSING"}</span>
                </div>
                <div className="translation-columns">
                  <label>English<textarea value={item.sourceText} readOnly rows={3} /></label>
                  <label>Português (Brasil)<textarea value={drafts[item.id] ?? ""} onChange={(event) => setDrafts((values) => ({ ...values, [item.id]: event.target.value }))} rows={3} /></label>
                </div>
                <div className="translation-actions">
                  <span>{changed ? "Unsaved changes" : current?.updatedAt ? `Updated ${new Date(current.updatedAt).toLocaleString()}` : "No translation yet"}</span>
                  <button type="button" className="secondary-button" disabled={busyKey === item.id || !changed} onClick={() => void persist(item, "DRAFT")}>Save Draft</button>
                  <button type="button" disabled={busyKey === item.id} onClick={() => void persist(item, "PUBLISHED")}>Publish</button>
                </div>
              </article>
            );
          })}
          {!items.length && <div className="admin-empty"><h2>No translations found</h2><p>Adjust the search or filters.</p></div>}
        </section>
      )}
    </main>
  );
}
