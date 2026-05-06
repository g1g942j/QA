(function () {
  const STORAGE_KEY = "recipebook-theme";
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");

  function applyTheme(theme) {
    if (theme === "light") {
      root.classList.add("theme-light");
      root.classList.remove("theme-dark");
    } else {
      root.classList.add("theme-dark");
      root.classList.remove("theme-light");
    }
  }

  function getSavedTheme() {
    return localStorage.getItem(STORAGE_KEY) || "dark";
  }

  function saveTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
  }

  const currentTheme = getSavedTheme();
  applyTheme(currentTheme);

  if (toggle) {
    toggle.addEventListener("click", () => {
      const isLight = root.classList.contains("theme-light");
      const nextTheme = isLight ? "dark" : "light";
      applyTheme(nextTheme);
      saveTheme(nextTheme);
    });
  }
})();
