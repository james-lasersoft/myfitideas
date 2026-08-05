import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";
import { AdminPageHeader } from "./AdminComponents";

export default function TranslationAdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { t } = useLocale();

  return (
    <div className="translation-admin-shell admin-page">
      <AdminPageHeader
        eyebrow={t("Administration / Translations")}
        title={t("Translation Management")}
        description={t("English is the canonical source. Edit Portuguese drafts, review them, and publish approved wording.")}
        backLabel={t("Back to Admin")}
        onBack={() => navigate("/admin")}
      />
      <div className="translation-admin-shell-content">{children}</div>
    </div>
  );
}
