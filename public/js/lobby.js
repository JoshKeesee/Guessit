const joinPopup = document.querySelector("#join-popup");
const joinBtn = document.querySelector("#join");
const joinCode = document.querySelector("#join-code");
const fade = document.querySelector("#lobby #fade");

const checkCode = () => {
  if (joinCode.disabled) return;
  code = joinCode.value;
  if (!code) return (code = "");
  const url = new URL(window.location.href);
  url.searchParams.set("code", code);
  joinCode.disabled = true;

  socket.emit("check code", code, (valid, error) => {
    const e = document.querySelector(".error");
    if (valid) {
      joinCode.blur();
      history.pushState({}, "", url);
      const d = 500,
        a = {
          opacity: [1, 0],
          transform: [
            "translate(-50%, -50%) scale(1)",
            "translate(-50%, -70%) scale(0.5)",
          ],
        };
      joinPopup.animate(a, {
        duration: d,
        easing: "ease",
      }).onfinish = () => {
        e.innerText = "";
        joinCode.value = "";
        joinCode.type = "text";
        joinCode.placeholder = "Enter name";
        joinCode.disabled = false;
        joinCode.focus();
        const b = structuredClone(a);
        joinBtn.onclick = () => {
          joinCode.disabled = true;
          joinCode.blur();
          name = joinCode.value.replace(/[^a-zA-Z0-9]/g, "").trim();
          if (name) {
            socket.emit("join", code, name, (valid, error) => {
              joinCode.disabled = false;
              if (valid) {
                joinPopup.animate(b, {
                  duration: d,
                  easing: "ease",
                }).onfinish = () => {
                  joinPopup.style.display = "none";
                  fade.classList.add("active");
                  document.querySelector("#loading").classList.add("active");
                };
              } else {
                e.innerText = error;
                joinCode.value = "";
                joinCode.disabled = false;
                joinCode.focus();
              }
            });
          } else {
            e.innerText = "Name required";
            name = "";
            joinCode.value = "";
            joinCode.disabled = false;
            joinCode.focus();
          }
        };
        a.opacity = a.opacity.reverse();
        a.transform = a.transform.reverse();
        joinPopup.animate(a, {
          duration: d,
          easing: "ease",
        });
      };
    } else {
      e.innerText = error;
      joinCode.value = "";
      joinCode.disabled = false;
      joinCode.focus();
    }
  });
};

joinBtn.onclick = checkCode;

joinCode.onkeyup = (e) => {
  if (e.key == "Enter") joinBtn.click();
};

const url = new URL(window.location.href);
code = url.searchParams.get("code");
if (code) {
  joinCode.value = code;
  joinBtn.click();
} else code = "";
