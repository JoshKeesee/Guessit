(() => {
  const search = document.querySelector("#search");
  const searchBtn = search.querySelector("#search-btn");
  const searchBar = search.querySelector("#search-bar");

  const updatePacks = () => {
    const packs = document.querySelectorAll("#pack");
    packs.forEach((pack) => {
      const c = pack.dataset.created,
        u = pack.dataset.updated,
        s = c == u;
      pack.querySelector(".tag.date").innerText = `${
        s ? "Created" : "Updated"
      } ${timeAgo(new Date(s ? c : u))}`;
      const id = pack.dataset.id;
      pack.onclick = (e) => {
        if (pack.querySelector("div.btns").contains(e.target)) return;
        const a = document.createElement("a");
        a.href = `pack/${id}`;
        a.style.display = "none";
        document.querySelector("#container").appendChild(a);
        linkSetup();
        a.click();
      };
    });
  };

  searchBtn.onclick = () => {
    const q = searchBar.value;
    const url = new URL("search", location.origin);
    if (q) url.searchParams.set("q", q);
    const a = document.createElement("a");
    a.href = url;
    a.style.display = "none";
    document.querySelector("#container").appendChild(a);
    linkSetup();
    a.click();
  };

  searchBar.onkeydown = (e) => {
    if (e.key == "Enter") searchBtn.click();
  };

  const url = new URL(location.href);
  const q = url.searchParams.get("q");
  if (q) searchBar.value = q;
  updatePacks();
})();
