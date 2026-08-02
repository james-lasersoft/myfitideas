import LanguageSelector from "../LanguageSelector";
import ThemeToggle from "../ThemeToggle";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import "./GlobalControls.css";

export default function GlobalControls() {
  return (
    <div className="global-controls-bar">
      <div className="global-controls-group">
        <WorkspaceSwitcher />
        <ThemeToggle />
        <LanguageSelector />
      </div>
    </div>
  );
}
