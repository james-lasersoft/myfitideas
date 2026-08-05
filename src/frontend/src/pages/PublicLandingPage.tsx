import { Link } from "react-router-dom";
import { useLocale } from "../i18n/LocaleContext";
import "./PublicPages.css";

export default function PublicLandingPage() {
  const { t } = useLocale();

  return (
    <div className="public-page public-landing-page">
      <section className="public-hero">
        <div className="public-hero-copy">
          <p className="public-kicker">{t("Body transformation, made measurable")}</p>
          <h1>{t("Build a clearer picture of your health and progress.")}</h1>
          <p>{t("MyFitIdeas brings measurements, hydration, progress trends, habits, and future AI insights into one privacy-conscious transformation platform.")}</p>
          <div className="public-hero-actions">
            <Link className="public-primary-action" to="/signup">{t("Create Your Account")}</Link>
            <Link className="public-secondary-action" to="/features">{t("Explore Features")}</Link>
          </div>
        </div>
        <aside className="public-hero-panel" aria-label={t("Platform highlights")}>
          <strong>{t("Start with identity, not health data")}</strong>
          <p>{t("Initial signup collects only essential account, localization, and consent information. Measurements and goals belong in onboarding after verification or activation.")}</p>
        </aside>
      </section>

      <section className="public-value-grid" aria-label={t("MyFitIdeas value areas")}>
        <article><h2>{t("Track what matters")}</h2><p>{t("Bring weight, body measurements, hydration, and progress history into one consistent record.")}</p></article>
        <article><h2>{t("Understand patterns")}</h2><p>{t("Use charts and future correlation insights to understand what supports lasting progress.")}</p></article>
        <article><h2>{t("Control your information")}</h2><p>{t("Review sessions, trusted devices, privacy preferences, and account access from a dedicated Security Center.")}</p></article>
      </section>
    </div>
  );
}
