(function () {
    const STORAGE_KEY = "ui-theme";
    const THEMES = [
        { id: "dark", label: "Темная" },
        { id: "light", label: "Серая" },
        { id: "blue", label: "Синяя" }
    ];

    function getSavedTheme() {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        return THEMES.some((theme) => theme.id === saved) ? saved : "dark";
    }

    function applyTheme(themeId) {
        const theme = THEMES.some((item) => item.id === themeId) ? themeId : "dark";
        document.documentElement.setAttribute("data-theme", theme);
        window.localStorage.setItem(STORAGE_KEY, theme);
        syncButtons(theme);
    }

    function syncButtons(activeTheme) {
        document.querySelectorAll(".theme-switcher__button").forEach((button) => {
            const isActive = button.dataset.theme === activeTheme;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function buildSwitcher() {
        if (document.querySelector(".theme-switcher")) {
            syncButtons(getSavedTheme());
            return;
        }

        const switcher = document.createElement("div");
        switcher.className = "theme-switcher glass-card fade-in-up";
        switcher.setAttribute("role", "group");
        switcher.setAttribute("aria-label", "Переключатель темы");

        const title = document.createElement("div");
        title.className = "theme-switcher__title";
        title.textContent = "Тема";
        switcher.appendChild(title);

        const buttons = document.createElement("div");
        buttons.className = "theme-switcher__buttons";

        THEMES.forEach((theme) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "theme-switcher__button";
            button.dataset.theme = theme.id;
            button.textContent = theme.label;
            button.addEventListener("click", () => applyTheme(theme.id));
            buttons.appendChild(button);
        });

        switcher.appendChild(buttons);
        document.body.appendChild(switcher);
        syncButtons(getSavedTheme());
    }

    function init() {
        applyTheme(getSavedTheme());
        buildSwitcher();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
