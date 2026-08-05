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

          <div className="public-benefit-row" aria-label={t("MyFitIdeas value areas")}>
            <div><span aria-hidden="true">▥</span><strong>{t("Track what matters")}</strong></div>
            <div><span aria-hidden="true">◎</span><strong>{t("Understand patterns")}</strong></div>
            <div><span aria-hidden="true">▣</span><strong>{t("Control your information")}</strong></div>
          </div>

          <div className="public-hero-actions">
            <Link className="public-primary-action" to="/signup">{t("Create Your Account")}</Link>
            <Link className="public-secondary-action" to="/features">{t("Explore Features")}</Link>
          </div>
          <p className="public-signup-note">{t("Initial signup collects only essential account, localization, and consent information. Measurements and goals belong in onboarding after verification or activation.")}</p>
        </div>

        <aside className="public-product-preview" aria-label={t("Platform highlights")}>
          <div className="public-preview-window">
            <div className="public-preview-heading">
              <strong>{t("Dashboard")}</strong>
              <span>{t("Today")}</span>
            </div>
            <div className="public-preview-metrics">
              <article><span>{t("Weight")}</span><strong data-no-translate="true">165.2</strong><small data-no-translate="true">-2.4 lb</small></article>
              <article><span>{t("Body Fat")}</span><strong data-no-translate="true">23.1%</strong><small data-no-translate="true">-1.3%</small></article>
              <article><span>{t("Hydration")}</span><strong data-no-translate="true">72%</strong><small data-no-translate="true">+8%</small></article>
            </div>
            <div className="public-preview-chart" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i />
            </div>
          </div>
          <div className="public-preview-phone">
            <span>{t("Progress")}</span>
            <strong data-no-translate="true">165.2 lb</strong>
            <div className="public-phone-chart" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <small>{t("Steady progress")}</small>
          </div>
          <div className="public-preview-security">🔒 {t("Your data stays private")}</div>
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
