(() => {
  window.name = "";
  window.socket = io({
    autoconnect: false,
  });
  window.game = {
    players: [
      {
        name,
        nextPointsPerCorrect: 1,
        nextPointsPerIncorrect: 1,
      },
    ],
    pack: {
      questions: [
        {
          question: "What is the capital of France?",
          answers: ["Paris"],
          answer_choices: ["Paris", "Beijing", "Hungary", "Berlin"],
          type: "multiple",
          id: 1,
        },
      ],
    },
    settings: {
      randomizeAnswers: true,
    },
  };
  const q = createQuestion(game.pack.questions[0]);
  document.querySelector("#questions").appendChild(q);
})();
