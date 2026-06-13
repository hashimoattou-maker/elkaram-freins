import { createContext, useContext, useEffect, useState } from "react";

type ColorScheme = "dark" | "light";
type AppTheme = "default" | "emerald" | "ruby" | "amethyst" | "ocean";

interface ThemeContextType {
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
  appTheme: AppTheme;
  setAppTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEMES: { value: AppTheme; label: string; color: string }[] = [
  { value: "default", label: "Default", color: "#1e40af" },
  { value: "emerald", label: "Emerald", color: "#10b981" },
  { value: "ruby", label: "Ruby", color: "#dc2626" },
  { value: "amethyst", label: "Amethyst", color: "#8b5cf6" },
  { value: "ocean", label: "Ocean", color: "#0d9488" },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const stored = localStorage.getItem("colorScheme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [appTheme, setAppTheme] = useState<AppTheme>(() => {
    const stored = localStorage.getItem("appTheme");
    if (stored === "default" || stored === "emerald" || stored === "ruby" || stored === "amethyst" || stored === "ocean") return stored;
    return "default";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "theme-default", "theme-emerald", "theme-ruby", "theme-amethyst", "theme-ocean");
    root.classList.add(colorScheme, `theme-${appTheme}`);
    localStorage.setItem("colorScheme", colorScheme);
    localStorage.setItem("appTheme", appTheme);
  }, [colorScheme, appTheme]);

  const toggleColorScheme = () => {
    setColorScheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme, appTheme, setAppTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export { THEMES };
export type { AppTheme };
