import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useLocale } from "../i18n/LocaleContext";
import "./PublicPages.css";
import "./PublicDetailPages.css";

const featureGroups = [
  ["Body tracking", "Record weight, body measurements, hydration, and progress history in one consistent place."],
  ["Progress intelligence", "Review clear trends and build toward future correlations, reports, and AI-guided insights."],
  ["Daily habits", "Bring nutrition, workouts, sleep, recovery, and habits into the same transformation journey."],
  ["Privacy controls", "Manage consent, sessions, trusted devices, and account access with dedicated security tools."],
  ["Flexible preferences", "Use localized language, time, date, and measurement preferences across your experience."],
  ["Future connections", "Prepare for wearable integrations, coach collaboration, exports, and advanced analytics."],
] as const;

const planGroups = [
  {
    name: "Foundation",
    audience: "For starting your transformation record",
    items: ["Account and security controls", "Measurements and hydration", "Progress charts", "Localized preferences"],
  },
  {
    name: "Transformation",
    audience: "For a connected long-term journey",
    featured: true,
    items: ["Everything in Foundation", "Nutrition, workouts, sleep, and habits", "Advanced reports and correlations", "Future AI-guided insights"],
  },
  {
    name: "Coach and Team",
    audience: "For guided or professional support",
    items: ["Shared client progress", "Role-based access", "Coach and trainer workflows", "Organization administration"],
  },
] as const;

function PageIntro({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  const { t } = useLocale();
  return (
    <header className="public-page-intro">
      <p className="public-kicker">{t(kicker)}</p>
      <h1>{t(title)}</h1>
      <p>{t(description)}</p>
    </header>
  );
}

function FeaturesPage() {
  const { t } = useLocale();
  return (
    <section className="public-page public-detail-page">
      <PageIntro kicker="A connected transformation platform" title="Features built around your whole journey" description="MyFitIdeas is designed to connect the information, routines, and insights that support sustainable body transformation." />
      <div className="public-feature-grid">
        {featureGroups.map(([title, description], index) => (
          <article key={title}>
            <span className="public-feature-number" data-no-translate="true">{String(index + 1).padStart(2, "0")}</span>
            <h2>{t(title)}</h2>
            <p>{t(description)}</p>
          </article>
        ))}
      </div>
      <div className="public-page-cta">
        <div><h2>{t("Start with a secure account")}</h2><p>{t("Health measurements and goals are collected later through guided onboarding.")}</p></div>
        <Link className="public-primary-action" to="/signup">{t("Create Account")}</Link>
      </div>
    </section>
  );
}

function PricingPage() {
  const { t } = useLocale();
  return (
    <section className="public-page public-detail-page">
      <PageIntro kicker="Simple plans, before billing" title="Choose the experience that fits your journey" description="Pricing is not active yet. These plan previews show the intended product structure without creating a subscription or payment obligation." />
      <div className="public-plan-grid">
        {planGroups.map((plan) => (
          <article key={plan.name} className={plan.featured ? "public-plan-card featured" : "public-plan-card"}>
            {plan.featured && <span className="public-plan-badge">{t("Planned premium experience")}</span>}
            <h2>{t(plan.name)}</h2>
            <p>{t(plan.audience)}</p>
            <strong className="public-plan-price">{t("Pricing coming before billing launch")}</strong>
            <ul>{plan.items.map((item) => <li key={item}>{t(item)}</li>)}</ul>
            <Link className={plan.featured ? "public-primary-action" : "public-secondary-action"} to="/signup">{t("Create Account")}</Link>
          </article>
        ))}
      </div>
      <p className="public-pricing-note">{t("Creating an account does not create a paid subscription. Account status and subscription status remain separate.")}</p>
    </section>
  );
}

function CheckoutResultPage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const requestedStatus = searchParams.get("status") ?? "pending";
  const status = ["success", "canceled", "failed", "pending"].includes(requestedStatus) ? requestedStatus : "pending";
  const copy = {
    success: ["Checkout complete", "Your payment result will be confirmed securely with the billing provider before access changes."],
    canceled: ["Checkout canceled", "No subscription change was completed. You may return to pricing when you are ready."],
    failed: ["Checkout could not be completed", "No access change should occur until the backend verifies a successful payment result."],
    pending: ["Checkout confirmation pending", "This page is ready for provider-verified billing results when checkout is activated."],
  }[status] as readonly [string, string];

  return (
    <section className="public-page public-result-page">
      <div className={`public-result-icon ${status}`} aria-hidden="true">{status === "success" ? "✓" : status === "canceled" ? "↩" : status === "failed" ? "!" : "…"}</div>
      <p className="public-kicker">{t("Checkout result")}</p>
      <h1>{t(copy[0])}</h1>
      <p>{t(copy[1])}</p>
      <div className="public-hero-actions">
        <Link className="public-primary-action" to="/pricing">{t("Return to Pricing")}</Link>
        <Link className="public-secondary-action" to="/login">{t("Log In")}</Link>
      </div>
    </section>
  );
}

function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const { t } = useLocale();
  const privacy = type === "privacy";
  const sections = privacy
    ? [
        ["Information we collect", "We collect essential account, localization, consent, security, and service-use information. Health measurements and goals are collected later when you choose to provide them during onboarding or product use."],
        ["How information is used", "Information supports account operation, security, personalization, requested features, customer support, and service improvement. Aggregate analytics preferences are managed separately where offered."],
        ["Security and account activity", "We may retain login, device, session, IP-derived location, and audit information to protect accounts and help users review access. We do not use a device's internal GPS for login geolocation."],
        ["Sharing and service providers", "Information may be processed by carefully selected infrastructure, security, communication, analytics, and future billing providers under appropriate agreements and access controls."],
        ["Your choices", "Available controls may include consent preferences, session revocation, trusted-device management, account correction, export, deletion, and applicable privacy requests."],
        ["Retention and changes", "Information is retained only as needed for service, security, legal, and operational purposes. Material policy changes will use a new version and effective date."],
      ]
    : [
        ["Using MyFitIdeas", "You must provide accurate account information, protect your credentials, and use the service lawfully. Access may depend on verification, account status, permissions, and future subscription entitlements."],
        ["Health information and guidance", "MyFitIdeas is a tracking and decision-support platform. It does not replace medical diagnosis, treatment, emergency services, or advice from a qualified healthcare professional."],
        ["Account status", "Accounts may be pending verification, active, suspended, or closed independently from any subscription status. Security or policy restrictions take priority over billing status."],
        ["Subscriptions and billing", "Paid plans are not active yet. Future purchases, renewals, cancellations, refunds, and billing terms will be presented before payment and verified through the backend and billing provider."],
        ["Acceptable use", "You may not misuse the service, interfere with security, access data without authorization, upload unlawful content, or attempt to reverse engineer protected systems except where law permits."],
        ["Changes and termination", "Features and terms may evolve. Material changes will use a new version and effective date. Users may close accounts subject to lawful retention and unresolved obligations."],
      ];

  return (
    <article className="public-page public-legal-page">
      <PageIntro kicker="Public legal information" title={privacy ? "Privacy Notice" : "Terms of Service"} description={privacy ? "This prelaunch notice explains the intended handling of account, security, consent, and health-related information." : "These prelaunch terms describe the intended rules for accessing and using MyFitIdeas."} />
      <div className="public-legal-meta">
        <span>{t("Version")}: <strong data-no-translate="true">0.1 Draft</strong></span>
        <span>{t("Effective date")}: <strong>{t("Not yet effective")}</strong></span>
        <span>{t("Status")}: <strong>{t("Legal review required before launch")}</strong></span>
      </div>
      <div className="public-legal-sections">
        {sections.map(([title, description]) => <section key={title}><h2>{t(title)}</h2><p>{t(description)}</p></section>)}
      </div>
      <aside className="public-legal-disclaimer">{t("This is a product-design draft and is not the final legally approved policy.")}</aside>
    </article>
  );
}

export default function PublicInformationPage() {
  const { pathname } = useLocation();
  if (pathname === "/features") return <FeaturesPage />;
  if (pathname === "/pricing") return <PricingPage />;
  if (pathname === "/checkout/result") return <CheckoutResultPage />;
  if (pathname === "/privacy") return <LegalPage type="privacy" />;
  return <LegalPage type="terms" />;
}
