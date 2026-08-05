import { Link, useSearchParams } from "react-router-dom";
import { useLocale } from "../i18n/LocaleContext";
import "./VerificationPendingPage.css";

export default function VerificationPendingPage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";

  return (
    <main className="verification-page">
      <section className="verification-card" aria-labelledby="verification-heading">
        <div className="verification-icon" aria-hidden="true">✉</div>
        <p className="public-kicker">{t("Account created")}</p>
        <h1 id="verification-heading">{t("Check your email")}</h1>
        <p>{t("We are preparing a verification message for")}</p>
        {email && <strong className="verification-email" data-no-translate="true">{email}</strong>}
        <p>{t("Your account is secure and pending verification. Health measurements and goals have not been collected yet.")}</p>
        <div className="verification-actions">
          <button type="button" disabled>{t("Resend verification email")}</button>
          <Link to="/signup">{t("Use a different email")}</Link>
        </div>
        <aside>{t("Email delivery will become active when an email provider is enabled in Company Settings.")}</aside>
        <Link className="verification-login-link" to="/login">{t("Return to Log In")}</Link>
      </section>
    </main>
  );
}
