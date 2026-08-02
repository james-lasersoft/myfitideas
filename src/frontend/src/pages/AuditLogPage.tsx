import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useLocale } from "../i18n/LocaleContext";
import { getAuditLogs } from "../services/rbacService";
import "./SecurityAdmin.css";

interface AuditItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  result: string;
  createdAt: string;
  actor: { email: string; firstName: string; lastName: string | null } | null;
}

export default function AuditLogPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    getAuditLogs(page).then((result) => {
      setItems(result.items as AuditItem[]);
      setPageCount(result.pagination.pageCount);
    });
  }, [page]);

  return (
    <main className="admin-page security-admin-page">
      <header className="admin-header compact">
        <div><p className="admin-eyebrow">{t("Administration / Audit")}</p><h1>{t("Audit Log")}</h1><p>{t("Review security-sensitive and administrative activity.")}</p></div>
        <Button variant="outline" onClick={() => navigate("/admin")}>{t("Back to Admin")}</Button>
      </header>
      <section className="security-panel">
        <div className="security-table-wrap"><table className="security-table"><thead><tr><th>{t("Time")}</th><th>{t("Actor")}</th><th>{t("Action")}</th><th>{t("Target")}</th><th>{t("Result")}</th></tr></thead><tbody>
          {items.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.actor?.email ?? t("System")}</td><td><code>{item.action}</code></td><td>{item.targetType}{item.targetId ? ` · ${item.targetId}` : ""}</td><td><span className={`audit-result ${item.result.toLowerCase()}`}>{item.result}</span></td></tr>)}
        </tbody></table></div>
        <div className="translation-pagination"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>{t("Previous")}</Button><span>{t("Page")} {page} {t("of")} {pageCount}</span><Button variant="outline" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>{t("Next")}</Button></div>
      </section>
    </main>
  );
}
