const addQuestion = document.querySelector("#add-question");
const cancelPopup = document.querySelector(".popup #cancel");
const popup = document.querySelector("#question-popup");
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

const t = popup.querySelector("#type");
t.onchange = () => {
  popup
    .querySelector("#multiple-choice")
    .classList.toggle("active", t.value == "multiple");
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
    answer_choices: [...el.querySelectorAll(".answer")].map((e) => e.innerText),
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
  c.appendChild(h);
  c.appendChild(a);
  c.onclick = () => editQuestion(c);
  return c;
};

document
  .querySelectorAll(".question")
  .forEach((e) => (e.onclick = () => editQuestion(e)));

popup.addEventListener("submit", async (e) => {
  e.preventDefault();
  const editing = popup.classList.contains("editing");
  const q = popup.querySelector("#question").value,
    type = t.value,
    tof_a = popup.querySelector("#tof-a").checked,
    cas = [...popup.querySelectorAll("input[type='checkbox']:checked")].filter(
      (e) => e.id != "tof-a",
    ),
    ac = [...popup.querySelectorAll(".answer")]
      .filter((e) => e.value)
      .map((e) => e.value),
    a = cas.map((e) => popup.querySelector("#a" + e.id.split("").pop()).value);
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
  console.log(question);
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
    popup.querySelector(".error").innerText = data.error || "An error occurred";
});
