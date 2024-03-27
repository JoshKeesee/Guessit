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
        {
          question: "What is the capital of Germany?",
          answers: ["Berlin"],
          answer_choices: ["Paris", "Beijing", "Hungary", "Berlin"],
          type: "multiple",
          id: 2,
        },
        {
          question: "What is the capital of Spain?",
          answers: ["Madrid"],
          answer_choices: ["Paris", "Beijing", "Hungary", "Madrid"],
          type: "multiple",
          id: 3,
        },
        {
          question: "What is the capital of Italy?",
          answers: ["Rome"],
          answer_choices: ["Paris", "Rome", "Hungary", "Berlin"],
          type: "multiple",
          id: 4,
        },
        {
          question: "What is the capital of Japan?",
          answers: ["Tokyo"],
          answer_choices: ["Tokyo", "Beijing", "Hungary", "Berlin"],
          type: "multiple",
          id: 5,
        },
        {
          question: "What is the capital of China?",
          answers: ["Beijing"],
          answer_choices: ["Beijing", "Belgium", "Hungary", "Berlin"],
          type: "multiple",
          id: 6,
        },
      ],
    },
    settings: {
      randomizeAnswers: true,
    },
  };
  game.pack.questions = shuffle(game.pack.questions);
  const q = createQuestion(game.pack.questions[0]);
  document.querySelector("#questions").appendChild(q);
})();
