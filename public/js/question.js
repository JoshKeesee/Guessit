window.qns = document.querySelector("#questions");
window.currQuestion = 0;

window.nextQuestion = (i) => {
  const id = i || shuffle([...Array(game.pack.questions.length).keys()])[0];
  const nq = createQuestion(game.pack.questions[id]);
  const q = qns.querySelector("#question-container");
  if (q) {
    q.style.position = "absolute";
    q.style.top = "var(--header-height)";
    q.style.left = "0";
    q.style.zIndex = "999";
    q.style.background = "none";
    q.style.pointerEvents = "none";
    const d = 300;
    const a = q.animate(
      {
        opacity: [1, 0],
        transform: ["translateY(0)", "translateY(100%)"],
      },
      {
        duration: d,
        easing: "ease-out",
      }
    );
    a.onfinish = () => q.remove();
    a.oncancel = () => q.remove();
    setTimeout(() => q && q.remove(), d);
  }
  qns.appendChild(nq);
};

window.checkAnswer = (a) => {
  playSound("click");
  const q = a.parentElement.parentElement;
  const ans = q.querySelectorAll(".answer");
  const c = a.dataset.correct == "true";
  ans.forEach((e) => {
    e.onclick = () => {};
    const c = e.dataset.correct == "true";
    if (c || e.dataset.answer == a.dataset.answer) e.classList.add("check");
    else e.classList.add("faded");
  });
  setTimeout(() => {
    if (c) playSound("correct");
    else playSound("incorrect");
    const p = game.players.find((e) => e.name == name);
    const ca = [...q.querySelectorAll(".answer[data-correct='true']")].map(
      (e) => e.innerText
    );
    const f = q.querySelector(".feedback");
    f.querySelector("h1").innerText = c ? "Correct!" : "Incorrect";
    f.querySelector("p").innerHTML = c
      ? "<div id='money'>+$" +
        p.nextPointsPerCorrect.toString().withCommas() +
        "</div>"
      : "<div id='money'>-$" +
        p.nextPointsPerIncorrect.toString().withCommas() +
        "</div><span>The correct answer" +
        (ca.length > 1 ? "s are" : " is") +
        ": <b>" +
        ca.join(", ") +
        "</b></span>";
    if (c) q.classList.add("correct");
    else q.classList.add("incorrect");
    socket.emit("submit answer", {
      answer: a.dataset.answer,
      current: q.dataset.id,
    });
  }, 300);
};

window.createQuestion = (question) => {
  const c = document.createElement("div");
  c.id = "question-container";
  c.dataset.id = question.id;
  const q = document.createElement("div");
  q.classList.add("question");
  const text = document.createElement("div");
  text.id = "text";
  text.innerText = question.question;
  q.appendChild(text);
  const feedback = document.createElement("div");
  feedback.classList.add("feedback");
  const fH1 = document.createElement("h1");
  fH1.innerText = "";
  feedback.appendChild(fH1);
  const fP = document.createElement("p");
  fP.innerText = "";
  feedback.appendChild(fP);
  q.appendChild(feedback);
  const ans = document.createElement("div");
  ans.classList.add("answers");
  let answers = structuredClone(question.answer_choices);
  if (game.settings.randomizeAnswers) answers = shuffle(answers);
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
    playSound("click");
    nextQuestion();
  };
  next.appendChild(btn);
  c.appendChild(q);
  c.appendChild(ans);
  c.appendChild(next);
  return c;
};
