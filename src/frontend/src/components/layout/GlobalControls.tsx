import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";
import api from "../../services/api";
import BrandLogo from "../BrandLogo";
import LanguageSelector from "../LanguageSelector";
import ThemeToggle from "../ThemeToggle";
import AccountMenu from "./AccountMenu";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import "./GlobalControls.css";
import "./MemberShell.css";

function readSessionId(token: string): string | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized)) as { sessionId?: unknown };
    return typeof payload.sessionId === "string" ? payload.sessionId : null;
  } catch {
    return null;
  }
}

const MEMBER_ROUTES = [
  "/dashboard",
  "/measurements",
  "/hydration",
  "/progress",
  "/profile",
];

function isMemberRoute(pathname: string): boolean {
  return MEMBER_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function GlobalControls() {
  const location = useLocation();
  const { t } = useLocale();
  const isAdminWorkspace = location.pathname.startsWith("/admin");
  const isSystemWorkspace = location.pathname.startsWith("/system-operations");
  const isMemberWorkspace = isMemberRoute(location.pathname);
  const isAuthenticatedWorkspace = isAdminWorkspace || isSystemWorkspace || isMemberWorkspace;
  const workspaceClass = isSystemWorkspace
    ? "system-global-controls"
    : isAdminWorkspace
      ? "admin-global-controls"
      : isMemberWorkspace
        ? "member-global-controls"
        : "";
  const brandClass = isSystemWorkspace
    ? "system-global-brand"
    : isAdminWorkspace
      ? "admin-global-brand"
      : "member-global-brand";
  const logoClass = isSystemWorkspace
    ? "system-global-logo"
    : isAdminWorkspace
      ? "admin-global-logo"
      : "member-global-logo";
  const brandLabel = isSystemWorkspace
    ? t("MyFitIdeas System Operations")
    : isAdminWorkspace
      ? t("MyFitIdeas Admin Center")
      : "MyFitIdeas";

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    const sessionId = readSessionId(token);
    if (!sessionId) return;
    const storageKey = `myfitideas-location-enriched:${sessionId}`;
    if (sessionStorage.getItem(storageKey)) return;

    sessionStorage.setItem(storageKey, "pending");
    void api.post("/api/auth/security/session/location")
      .then(() => sessionStorage.setItem(storageKey, "complete"))
      .catch(() => sessionStorage.removeItem(storageKey));
  }, [location.pathname]);

  useEffect(() => {
    const body = document.body;
    body.classList.toggle("member-shell-active", isMemberWorkspace);
    body.classList.toggle("admin-shell-active", isAdminWorkspace);
    body.classList.toggle("system-shell-active", isSystemWorkspace);
    body.classList.remove("member-header-collapsed");

    if (!isMemberWorkspace) {
      return () => {
        body.classList.remove("member-shell-active", "admin-shell-active", "system-shell-active", "member-header-collapsed");
      };
    }

    let collapsed = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      const nextCollapsed = collapsed ? window.scrollY > 56 : window.scrollY > 132;
      if (nextCollapsed === collapsed) return;
      collapsed = nextCollapsed;
      body.classList.toggle("member-header-collapsed", collapsed);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      body.classList.remove("member-shell-active", "admin-shell-active", "system-shell-active", "member-header-collapsed");
    };
  }, [isAdminWorkspace, isMemberWorkspace, isSystemWorkspace, location.pathname]);

  return (
    <div className={`global-controls-bar${workspaceClass ? ` ${workspaceClass}` : ""}`}>
      {isAuthenticatedWorkspace && (
        <div className={brandClass} aria-label={brandLabel}>
          <BrandLogo className={logoClass} />
        </div>
      )}
      <div className="global-controls-group">
        <WorkspaceSwitcher />
        <ThemeToggle />
        <LanguageSelector />
        {isAuthenticatedWorkspace && <AccountMenu />}
      </div>
    </div>
  );
}
