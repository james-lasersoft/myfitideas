import LanguageSelector from "../LanguageSelector";
import ThemeToggle from "../ThemeToggle";
import "./GlobalControls.css";

export default function GlobalControls() {
  return (
    <div className="global-controls-bar">
      <div className="global-controls-group">
        <ThemeToggle />
        <LanguageSelector />
      </div>
    </div>
  );
}
