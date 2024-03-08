const qns = document.querySelector("#questions");
let currQuestion = 0;

const nextQuestion = (i) => {
  const id = i || Math.floor(Math.random() * game.pack.questions.length);
  const nq = createQuestion(game.pack.questions[id]);
  const q = qns.querySelector("#question-container");
  if (q) {
    q.style.position = "absolute";
    q.style.top = "var(--header-height)";
    q.style.left = "0";
    q.style.zIndex = "999";
    q.style.background = "none";
    const d = 300;
    q.animate(
      {
        opacity: [1, 0],
        transform: ["translateY(0)", "translateY(100%)"],
      },
      {
        duration: d,
        easing: "ease-out",
      },
    ).onfinish = () => q.remove();
  }
  qns.appendChild(nq);
};

const checkAnswer = (a) => {
  const q = a.parentElement.parentElement;
  const ans = q.querySelectorAll(".answer");
  const c = a.dataset.correct == "true";
  ans.forEach((e) => {
    const c = e.dataset.correct == "true";
    if (c || e.dataset.answer == a.dataset.answer) e.classList.add("check");
    else e.classList.add("faded");
  });
  setTimeout(() => {
    if (c) q.classList.add("correct");
    else q.classList.add("incorrect");
    socket.emit("submit answer", {
      answer: a.dataset.answer,
      current: q.dataset.id,
    });
  }, 500);
};

const createQuestion = (question) => {
  const c = document.createElement("div");
  c.id = "question-container";
  c.dataset.id = question.id;
  const q = document.createElement("div");
  q.classList.add("question");
  const text = document.createElement("div");
  text.id = "text";
  text.innerText = question.question;
  q.appendChild(text);
  const ans = document.createElement("div");
  ans.classList.add("answers");
  let answers = structuredClone(question.answer_choices);
  if (game.settings.randomizeAnswers)
    answers = answers.sort(() => Math.random() - 0.5);
  answers.forEach((e, i) => {
    const a = document.createElement("div");
    a.classList.add("answer");
    a.classList.add("a" + (i + 1));
    a.dataset.answer = e;
    a.dataset.correct = question.answers.includes(e);
    a.innerText = e;
    a.onclick = () => checkAnswer(a);
    ans.appendChild(a);
  });
  const next = document.createElement("div");
  next.id = "next";
  const btn = document.createElement("div");
  btn.classList.add("btn");
  btn.innerText = "Continue";
  btn.onclick = () => {
    currQuestion++;
    if (currQuestion >= game.pack.questions.length) currQuestion = 0;
    nextQuestion(currQuestion);
  };
  next.appendChild(btn);
  c.appendChild(q);
  c.appendChild(ans);
  c.appendChild(next);
  return c;
};
