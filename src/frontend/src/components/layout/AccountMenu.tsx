import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";
import "./AccountMenu.css";

interface StoredUser {
  firstName?: string;
  lastName?: string | null;
  email?: string;
}

function readStoredUser(): StoredUser {
  try {
    const raw = localStorage.getItem("currentUser");
    return raw ? JSON.parse(raw) as StoredUser : {};
  } catch {
    return {};
  }
}

export default function AccountMenu() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const user = readStoredUser();

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || t("Account");
  const initials = useMemo(() => {
    const letters = [user.firstName, user.lastName]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim().charAt(0).toUpperCase())
      .join("");
    return letters || "U";
  }, [user.firstName, user.lastName]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const signOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    setOpen(false);
    navigate("/");
  };

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("Open account menu")}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-menu-avatar" aria-hidden="true">{initials}</span>
        <span className="account-menu-name">{displayName}</span>
        <span className="account-menu-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="account-menu-panel" role="menu">
          <div className="account-menu-summary">
            <strong>{displayName}</strong>
            {user.email && <span>{user.email}</span>}
          </div>
          <button type="button" role="menuitem" onClick={() => goTo("/profile")}>{t("Account Settings")}</button>
          <button type="button" role="menuitem" onClick={() => goTo("/profile/security")}>{t("Security Center")}</button>
          <div className="account-menu-divider" />
          <button type="button" role="menuitem" className="account-menu-signout" onClick={signOut}>{t("Sign Out")}</button>
        </div>
      )}
    </div>
  );
}
