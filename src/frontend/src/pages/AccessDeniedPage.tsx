import { useNavigate } from "react-router-dom";
import { useLocale } from "../i18n/LocaleContext";
import Button from "../components/ui/Button";

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  return (
    <main className="admin-page">
      <section className="admin-empty">
        <h1>{t("Access denied")}</h1>
        <p>{t("Your account does not have permission to open this page.")}</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>{t("Back to Dashboard")}</Button>
      </section>
    </main>
  );
}
