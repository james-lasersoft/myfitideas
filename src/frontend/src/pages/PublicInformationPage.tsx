import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../i18n/LocaleContext";
import "./PublicPages.css";

const pageKeys: Record<string, { title: string; description: string }> = {
  "/features": {
    title: "Features",
    description: "Explore the MyFitIdeas transformation platform and the capabilities planned for each stage of the customer journey.",
  },
  "/pricing": {
    title: "Pricing",
    description: "Plan presentation is being prepared before billing activation. Account creation remains separate from subscription state.",
  },
  "/checkout/result": {
    title: "Checkout Result",
    description: "This route is reserved for verified billing outcomes when checkout is introduced.",
  },
  "/privacy": {
    title: "Privacy",
    description: "The public privacy notice and versioned consent language will be published here before customer launch.",
  },
  "/terms": {
    title: "Terms",
    description: "The public terms of service and effective version will be published here before customer launch.",
  },
};

export default function PublicInformationPage() {
  const { pathname } = useLocation();
  const { t } = useLocale();
  const page = pageKeys[pathname] ?? pageKeys["/features"];

  return (
    <section className="public-page public-information-page">
      <p className="public-kicker">{t("MyFitIdeas Public Experience")}</p>
      <h1>{t(page.title)}</h1>
      <p>{t(page.description)}</p>
      <Link className="public-primary-action" to="/signup">{t("Create Account")}</Link>
    </section>
  );
}
