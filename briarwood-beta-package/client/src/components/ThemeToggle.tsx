import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      className="p-2 rounded-md border border-hairline hover:bg-surface transition-colors"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-brass" />
      ) : (
        <Moon className="w-4 h-4 text-ink" />
      )}
    </button>
  );
}
