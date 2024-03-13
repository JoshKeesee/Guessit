(() => {
  const authForm = document.querySelector("#auth-form");
  if (!authForm) return;
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(authForm);
    const data = await (
      await fetch(authForm.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(formData)),
      })
    ).json();
    const url = new URL(location.href);
    if (data.success) {
      const a = document.createElement("a");
      a.href = url.searchParams.get("redirect") || "/";
      document.querySelector("#container").appendChild(a);
      linkSetup();
      a.click();
    } else {
      const errors = document.querySelectorAll("#auth-form .error");
      errors.forEach((error) => (error.textContent = ""));
      data.errors?.forEach((error) => {
        document.querySelector(`#auth-form #${error.param}-error`).textContent =
          error.msg;
      });
    }
  });
})();
