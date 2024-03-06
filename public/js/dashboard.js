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

const updatePacks = () => {
    const packs = document.querySelectorAll("#pack");
    packs.forEach((pack) => {
        const c = pack.dataset.created, u = pack.dataset.updated, s = c == u;
        pack.querySelector(".tag.date").innerText = `${s ? "Created" : "Updated"} ${timeAgo(new Date(s ? c : u))}`;
        const id = pack.dataset.id;
        pack.onclick = () => {
            window.location.href = `pack/${id}`;
        };
    });
};

tabs.forEach((e) => {
    e.addEventListener("click", () => switchTab(e.dataset.tab));
});

window.onload = () => {
    const url = new URL(window.location.href);
    const tab = url.searchParams.get("tab");
    switchTab(tab || "home");
    updatePacks();
};