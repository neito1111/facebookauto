(function () {
    const STORAGE_KEY = "ui-theme";
    const THEMES = [
        { id: "dark", label: "Темная", icon: "fa-moon" },
        { id: "light", label: "Серая", icon: "fa-sun" },
        { id: "blue", label: "Синяя", icon: "fa-droplet" }
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

    function getMountTarget() {
        if (document.body.classList.contains("admin-shell")) {
            if (window.matchMedia("(max-width: 767.98px)").matches) {
                return document.querySelector(".mobile-header");
            }
            return document.querySelector(".sidebar-brand") || document.querySelector(".main-content");
        }

        return (
            document.querySelector(".auth-panel") ||
            document.querySelector(".landing-card") ||
            document.querySelector("main")
        );
    }

    function buildSwitcher() {
        let switcher = document.querySelector(".theme-switcher");
        if (!switcher) {
            switcher = document.createElement("div");
            switcher.className = "theme-switcher";
            switcher.setAttribute("role", "group");
            switcher.setAttribute("aria-label", "Переключатель темы");

            const buttons = document.createElement("div");
            buttons.className = "theme-switcher__buttons";

            THEMES.forEach((theme) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "theme-switcher__button";
                button.dataset.theme = theme.id;
                button.setAttribute("aria-label", theme.label);
                button.setAttribute("title", theme.label);
                button.innerHTML = `<i class="fas ${theme.icon}" aria-hidden="true"></i>`;
                button.addEventListener("click", () => applyTheme(theme.id));
                buttons.appendChild(button);
            });

            switcher.appendChild(buttons);
        }

        const target = getMountTarget();
        if (target && switcher.parentElement !== target) {
            target.appendChild(switcher);
        }

        syncButtons(getSavedTheme());
    }

    function init() {
        applyTheme(getSavedTheme());
        buildSwitcher();
        window.addEventListener("resize", buildSwitcher);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
