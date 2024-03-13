(() => {
  const createForm = document.querySelector("#create-form");
  if (!createForm) return;
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(createForm);
    const data = await (
      await fetch(createForm.action, {
        method: "POST",
        body: formData,
      })
    ).json();
    if (data.success) {
      const a = document.createElement("a");
      a.href = data.redirect;
      document.querySelector("#container").appendChild(a);
      linkSetup();
      a.click();
    }
  });
})();
