const tabs = document.querySelectorAll(".tab");
const content = document.querySelectorAll(".content");

const switchTab = (tab) => {
    const url = new URL(window.location.href);
    if (tab == "home") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url);
    tabs.forEach((el) => el.classList.remove("active"));
    document.querySelector(`.tab[data-tab="${tab}"]`).classList.add("active");
    const c = document.querySelector(`.content[data-tab="${tab}"]`);
    if (!c) return;
    content.forEach((el) => el.classList.remove("active"));
    c.classList.add("active");
};

tabs.forEach((e) => {
    e.addEventListener("click", () => switchTab(e.dataset.tab));
});