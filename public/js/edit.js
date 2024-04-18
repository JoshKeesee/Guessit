(() => {
  window.socket = io();
  const magicreateProgress = document.querySelector(
    "#magicreate-popup #progress",
  );
  const addQuestion = document.querySelector("#add-question");
  const magicreateButton = document.querySelector("#magicreate-button");
  const cancelPopup = document.querySelector("#question-popup #cancel");
  const cancelMagicreate = document.querySelector("#magicreate-popup #cancel");
  const popup = document.querySelector("#question-popup");
  const magicreate = document.querySelector("#magicreate-popup");
  const generateQuestions = document.querySelector("#generate-questions");
  const qc = document.querySelector("#question-container");

  addQuestion.onclick = cancelPopup.onclick = () => {
    popup.classList.toggle("active");
    popup.classList.remove("editing");
    delete popup.dataset.currentId;
    popup.reset();
    popup.querySelector("#multiple-choice").classList.add("active");
    popup
      .querySelectorAll("#task")
      .forEach((e, i) => (e.innerText = i == 0 ? "New" : "Add"));
  };

  magicreateButton.onclick = cancelMagicreate.onclick = () => {
    magicreate.classList.toggle("active");
    magicreate.classList.remove("editing");
    magicreate.reset();
  };

  generateQuestions.onclick = async (e) => {
    e.preventDefault();
    if (generateQuestions.classList.contains("disabled")) return;
    const params = {
      numQuestions: null,
      numAnswers: null,
      topic: null,
      difficulty: null,
      socketId: socket.id,
    };
    Object.keys(params).forEach(
      (k) =>
        k != "socketId" &&
        (params[k] = magicreate.querySelector("#" + k).value),
    );
    if (Object.values(params).some((e) => !e)) return;
    generateQuestions.classList.add("disabled");
    document.querySelector(
      "#generate-questions span.toggled",
    ).dataset.progress = 0;
    const data = await (
      await fetch("generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(params),
      })
    ).json();
    generateQuestions.classList.remove("disabled");
    if (data.success) {
      const questions = data.questions;
      for (let i = 0; i < questions.length; i++)
        qc.appendChild(createQuestion(questions[i]));
      const qnum = document.querySelectorAll(".question").length;
      document
        .querySelectorAll("#question-num span")
        .forEach(
          (e) => (e.innerText = qnum + " question" + (qnum == 1 ? "" : "s")),
        );
      createStatus(
        `Magicreate&trade; created ${questions.length} question${questions.length == 1 ? "" : "s"} successfully`,
        "success",
      );
      setTimeout(() => cancelMagicreate.click(), 500);
    } else createStatus(data.error || "An error occurred", "error");
  };

  socket.on("magicreate progress", (pr) => {
    magicreateProgress.style.setProperty(
      "--progress",
      Math.floor(pr * 100) + "%",
    );
    document.querySelector(
      "#generate-questions span.toggled",
    ).dataset.progress = Math.floor(pr * 100);
    if (pr >= 0) magicreateProgress.style.opacity = 1;
    if (pr == 1) {
      magicreateProgress.style.opacity = 0;
      setTimeout(
        () => magicreateProgress.style.setProperty("--progress", 0),
        300,
      );
    }
  });

  const t = popup.querySelector("#type");
  t.onchange = () => {
    popup
      .querySelector("#multiple-choice")
      .classList.toggle("active", t.value == "multiple");
  };

  const btn = (text, s, type, fn = () => {}) => {
    const b = document.createElement("div");
    b.onclick = fn;
    b.classList.add(...["btn", "bold"]);
    if (type) b.classList.add(type);
    const t = document.createElement("span");
    t.innerText = text;
    b.appendChild(t);
    if (typeof s == "object") {
      const i = svg(s.path, s.viewBox);
      b.appendChild(i);
    }
    return b;
  };

  const editQuestion = (el) => {
    popup.classList.add("active");
    popup.classList.add("editing");
    popup.reset();
    popup
      .querySelector("#multiple-choice")
      .classList.toggle("active", el.dataset.type != "tof");
    popup
      .querySelectorAll("#task")
      .forEach((e, i) => (e.innerText = i == 0 ? "Edit" : "Save"));
    const q = {
      question: el.querySelector("h3").innerText.split(") ")[1],
      answers: [...el.querySelectorAll(".answer[data-correct='true']")].map(
        (e) => e.innerText,
      ),
      answer_choices: [...el.querySelectorAll(".answer")].map(
        (e) => e.innerText,
      ),
      type: el.dataset.type || "multiple",
      id: el.dataset.id,
    };
    popup.querySelector("#question").value = q.question;
    if (q.type == "tof")
      popup.querySelector("#tof-a").checked = q.answers[0] == "True";
    q.answer_choices.forEach((a, i) => {
      popup.querySelector("#a" + (i + 1)).value = a;
      popup.querySelector("#c" + (i + 1)).checked = q.answers.includes(a);
    });
    popup.querySelector("#type").value = q.type;
    popup.dataset.currentId = q.id;
  };

  const checkDel = (e) => {
    const b = e.target;
    if (b.classList.contains("delete")) return true;
    if (b.parentElement.classList.contains("delete")) return true;
    if (b.parentElement.parentElement.classList.contains("delete")) return true;
    return false;
  };

  const createQuestion = (q) => {
    const c = document.createElement("div");
    c.className = "question";
    c.dataset.id = q.id;
    c.dataset.type = q.type;
    const h = document.createElement("h3");
    h.innerText =
      document.querySelectorAll(".question").length + 1 + ") " + q.question;
    const a = document.createElement("div");
    a.className = "answers";
    q.answer_choices.forEach((e) => {
      const b = document.createElement("div");
      b.className = "answer";
      b.dataset.correct = q.answers.includes(e);
      const s = document.createElement("span");
      s.innerText = e;
      b.appendChild(s);
      a.appendChild(b);
    });
    const e = btn("Edit Question", {
      path: "M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V299.6l-94.7 94.7c-8.2 8.2-14 18.5-16.8 29.7l-15 60.1c-2.3 9.4-1.8 19 1.4 27.8H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128zM549.8 235.7l14.4 14.4c15.6 15.6 15.6 40.9 0 56.6l-29.4 29.4-71-71 29.4-29.4c15.6-15.6 40.9-15.6 56.6 0zM311.9 417L441.1 287.8l71 71L382.9 487.9c-4.1 4.1-9.2 7-14.9 8.4l-60.1 15c-5.5 1.4-11.2-.2-15.2-4.2s-5.6-9.7-4.2-15.2l15-60.1c1.4-5.6 4.3-10.8 8.4-14.9z",
      viewBox: "0 0 576 512",
    });
    const d = btn(
      "Delete Question",
      {
        path: "M376.6 84.5c11.3-13.6 9.5-33.8-4.1-45.1s-33.8-9.5-45.1 4.1L192 206 56.6 43.5C45.3 29.9 25.1 28.1 11.5 39.4S-3.9 70.9 7.4 84.5L150.3 256 7.4 427.5c-11.3 13.6-9.5 33.8 4.1 45.1s33.8 9.5 45.1-4.1L192 306 327.4 468.5c11.3 13.6 31.5 15.4 45.1 4.1s15.4-31.5 4.1-45.1L233.7 256 376.6 84.5z",
        viewBox: "0 0 384 512",
      },
      "delete",
      () => deleteQuestion(q.id),
    );
    c.appendChild(e);
    c.appendChild(d);
    c.appendChild(h);
    c.appendChild(a);
    c.onclick = (e) => {
      if (checkDel(e)) return;
      editQuestion(c);
    };
    return c;
  };

  document.querySelectorAll(".question").forEach((el) => {
    el.querySelector(".btn.delete").onclick = (e) =>
      deleteQuestion(el.dataset.id);
    el.onclick = (e) => {
      if (checkDel(e)) return;
      editQuestion(el);
    };
  });

  popup.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editing = popup.classList.contains("editing");
    const q = popup.querySelector("#question").value,
      type = t.value,
      tof_a = popup.querySelector("#tof-a").checked,
      cas = [
        ...popup.querySelectorAll("input[type='checkbox']:checked"),
      ].filter((e) => e.id != "tof-a"),
      ac = [...popup.querySelectorAll(".answer")]
        .filter((e) => e.value)
        .map((e) => e.value),
      a = cas.map(
        (e) => popup.querySelector("#a" + e.id.split("").pop()).value,
      );
    const question = {
      question: q,
      answers: type == "tof" ? [tof_a ? "True" : "False"] : a,
      answer_choices: type == "tof" ? ["True", "False"] : ac,
      type,
    };
    if (question.answers.length == 0)
      return (popup.querySelector(".error").innerText =
        "Please add at least one correct answer");
    if (question.answer_choices.length < 2)
      return (popup.querySelector(".error").innerText =
        "Please add at least two answer choices");
    popup.querySelector(".error").innerText = "";
    if (editing) question.id = popup.dataset.currentId;
    const data = await (
      await fetch((editing ? "edit" : "add") + "-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(question),
      })
    ).json();
    if (data.success) {
      const q = createQuestion(data.question);
      if (!editing) {
        qc.appendChild(q);
        const qnum = document.querySelectorAll(".question").length;
        document
          .querySelectorAll("#question-num span")
          .forEach(
            (e) => (e.innerText = qnum + " question" + (qnum == 1 ? "" : "s")),
          );
      } else {
        const o = qc.querySelector(
          ".question[data-id='" + data.question.id + "']",
        );
        const i = o.querySelector("h3").innerText.split(") ")[0];
        const h = q.querySelector("h3");
        h.innerText = i + ") " + h.innerText.split(") ")[1];
        qc.replaceChild(q, o);
      }
      cancelPopup.click();
    } else
      popup.querySelector(".error").innerText =
        data.error || "An error occurred";
  });

  const deleteQuestion = async (id) => {
    const data = await (
      await fetch("delete-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id }),
      })
    ).json();
    if (data.success) {
      const q = qc.querySelector(".question[data-id='" + data.id + "']");
      const { height } = q.getBoundingClientRect();
      q.animate(
        {
          transform: ["scale(1)", "scale(0)"],
          marginBottom: ["0", "-" + height + "px"],
        },
        {
          easing: "ease",
          duration: 500,
        },
      ).onfinish = () => {
        q.remove();
        const qs = qc.querySelectorAll(".question");
        qs.forEach((e, i) => {
          const h = e.querySelector("h3");
          h.innerText = i + 1 + ") " + h.innerText.split(") ")[1];
        });
        const qnum = qs.length;
        document
          .querySelectorAll("#question-num span")
          .forEach(
            (e) => (e.innerText = qnum + " question" + (qnum == 1 ? "" : "s")),
          );
      };
    }
  };
})();
