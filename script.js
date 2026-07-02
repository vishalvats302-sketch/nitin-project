/* Quiz App logic (Vanilla JS only)
   - Welcome -> Quiz -> Result -> Review
   - 15 seconds timer per question with auto-next
   - Shuffle questions and options
   - Keyboard shortcuts: A/B/C/D and Enter
   - LocalStorage best score
   - Dark/Light mode toggle
   - Confetti if score > 80%
*/

(() => {
  'use strict';

  // ===================== DOM Elements =====================
  const screenWelcome = document.getElementById('screenWelcome');
  const screenQuiz = document.getElementById('screenQuiz');
  const screenResult = document.getElementById('screenResult');
  const screenReview = document.getElementById('screenReview');

  const startBtn = document.getElementById('startBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  const restartBtn = document.getElementById('restartBtn');
  const reviewBtn = document.getElementById('reviewBtn');
  const backToResultBtn = document.getElementById('backToResultBtn');
  const reviewRestartBtn = document.getElementById('reviewRestartBtn');

  const resetBestBtn = document.getElementById('resetBestBtn');

  const questionCounter = document.getElementById('questionCounter');
  const timeLeftEl = document.getElementById('timeLeft');

  const questionTextEl = document.getElementById('questionText');

  const optButtons = [
    document.getElementById('opt0'),
    document.getElementById('opt1'),
    document.getElementById('opt2'),
    document.getElementById('opt3'),
  ];
  const optTextEls = [
    document.getElementById('optText0'),
    document.getElementById('optText1'),
    document.getElementById('optText2'),
    document.getElementById('optText3'),
  ];

  const progressFill = document.getElementById('progressFill');
  const progressBar = document.getElementById('progressBar');
  const progressPercentEl = document.getElementById('progressPercent');

  const statTotal = document.getElementById('statTotal');
  const statCorrect = document.getElementById('statCorrect');
  const statWrong = document.getElementById('statWrong');
  const statPercent = document.getElementById('statPercent');
  const statScore = document.getElementById('statScore');
  const perfBadge = document.getElementById('perfBadge');
  const bestUpdate = document.getElementById('bestUpdate');

  const reviewList = document.getElementById('reviewList');

  const themeToggle = document.getElementById('themeToggle');
  const bestScoreEl = document.getElementById('bestScore');

  const confettiCanvas = document.getElementById('confetti');
  const confettiCtx = confettiCanvas.getContext('2d');

  // ===================== Quiz Data =====================
  // Each item: { question, options, correctAnswer }
  const QUESTION_BANK = [
    {
      question: 'Which data structure uses FIFO (First In, First Out)?',
      options: ['Stack', 'Queue', 'Tree', 'Graph'],
      correctAnswer: 'Queue'
    },
    {
      question: 'What does HTML stand for?',
      options: ['HyperText Markup Language', 'HighText Machine Language', 'Home Tool Mark Language', 'HyperTransfer Markup Loop'],
      correctAnswer: 'HyperText Markup Language'
    },
    {
      question: 'Which of the following is NOT a JavaScript data type?',
      options: ['Number', 'String', 'Boolean', 'Float'],
      correctAnswer: 'Float'
    },
    {
      question: 'What will be the output of: typeof null ?',
      options: ['"null"', '"object"', '"undefined"', '"number"'],
      correctAnswer: '"object"'
    },
    {
      question: 'In JavaScript, which keyword is used to create a constant?',
      options: ['var', 'let', 'const', 'define'],
      correctAnswer: 'const'
    },
    {
      question: 'Which sorting algorithm has the worst-case time complexity of O(n^2)?',
      options: ['Merge Sort', 'Quick Sort', 'Bubble Sort', 'Heap Sort'],
      correctAnswer: 'Bubble Sort'
    },
    {
      question: 'Which language is primarily used to style web pages?',
      options: ['HTML', 'CSS', 'JavaScript', 'SQL'],
      correctAnswer: 'CSS'
    },
    {
      question: 'What is the time complexity of binary search in a sorted array?',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
      correctAnswer: 'O(log n)'
    },
    {
      question: 'Which HTTP method is typically used to submit form data?',
      options: ['GET', 'POST', 'PUT', 'PATCH'],
      correctAnswer: 'POST'
    },
    {
      question: 'Which concept is used to prevent SQL injection attacks?',
      options: ['String concatenation', 'Prepared statements', 'Removing indexes', 'Using plain text queries'],
      correctAnswer: 'Prepared statements'
    },
    {
      question: 'Which of these is a relational database?',
      options: ['MongoDB', 'PostgreSQL', 'Redis', 'Cassandra'],
      correctAnswer: 'PostgreSQL'
    },
    {
      question: 'In Git, what does "commit" do?',
      options: ['Stores changes in the repository history', 'Creates a new branch automatically', 'Removes untracked files', 'Merges branches'],
      correctAnswer: 'Stores changes in the repository history'
    },
  ];

  // ===================== State =====================
  const TIME_PER_QUESTION = 15;
  const TOTAL_QUESTIONS = 10;

  let questions = []; // shuffled & prepared
  let currentIndex = 0;
  let timerId = null;
  let remainingSeconds = TIME_PER_QUESTION;

  // userAnswers: array of { selectedIndex:number|null, locked:boolean }
  let userAnswers = [];
  let quizStarted = false;

  // Store correct selections for review
  function normalizeCorrectAnswer(raw) {
    // For the one case where we store escaped string.
    if (raw === '"object"') return 'object';
    return String(raw).trim();
  }

  // ===================== Helpers =====================
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setView(viewEl) {
    // Hide all
    [screenWelcome, screenQuiz, screenResult, screenReview].forEach((s) => {
      s.classList.remove('view--active');
      s.setAttribute('aria-hidden', 'true');
    });

    viewEl.classList.add('view--active');
    viewEl.setAttribute('aria-hidden', 'false');
  }

  function setProgress() {
    const total = questions.length;
    const percent = total ? Math.round(((currentIndex) / total) * 100) : 0;

    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', String(percent));
    progressPercentEl.textContent = `${percent}%`;
  }

  function setOptionsDisabled(isDisabled) {
    optButtons.forEach((b) => {
      b.disabled = isDisabled;
      b.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
      b.classList.remove('selected');
    });
  }

  function clearOptionStates() {
    optButtons.forEach((b) => b.classList.remove('selected', 'correct', 'wrong'));
  }

  function updateOptionSelectionUI(selectedIndex) {
    clearOptionStates();
    if (selectedIndex === null || selectedIndex === undefined) return;
    const btn = optButtons[selectedIndex];
    if (btn) btn.classList.add('selected');
  }

  function lockCurrentAnswerUI() {
    const answer = userAnswers[currentIndex];
    if (!answer) return;

    const q = questions[currentIndex];
    const selectedIndex = answer.selectedIndex;
    const correctIndex = q.options.findIndex(o => o === q.correctAnswer);

    optButtons.forEach((btn, idx) => {
      btn.disabled = true;
      btn.style.cursor = 'not-allowed';
      if (idx === correctIndex) btn.classList.add('correct');
      else if (idx === selectedIndex) btn.classList.add('wrong');
    });
  }

  function startTimer() {
    stopTimer();
    remainingSeconds = TIME_PER_QUESTION;
    timeLeftEl.textContent = String(remainingSeconds);

    // Immediately set progress for this question number.
    setProgress();

    timerId = window.setInterval(() => {
      remainingSeconds -= 1;
      timeLeftEl.textContent = String(remainingSeconds);

      // Visual urgency
      const value = clamp(remainingSeconds, 0, TIME_PER_QUESTION);
      if (value <= 5) {
        timeLeftEl.parentElement.style.borderColor = 'rgba(220,38,38,.55)';
      } else {
        timeLeftEl.parentElement.style.borderColor = 'rgba(255,255,255,.18)';
      }

      // Auto next on time end
      if (remainingSeconds <= 0) {
        stopTimer();
        // If user hasn't locked answer yet, we auto-next.
        if (!userAnswers[currentIndex]?.locked) {
          // If no selection, keep it as null.
          handleNext(true);
        }
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  // ===================== Quiz Flow =====================
  function prepareQuiz() {
    const picked = shuffleArray(QUESTION_BANK).slice(0, TOTAL_QUESTIONS);

    // Shuffle options inside each question too.
    // Also normalize the special typeof null question.
    questions = picked.map((q) => {
      const normalizedCorrect = q.correctAnswer === '"object"' ? 'object' : String(q.correctAnswer).trim();
      // For display, we keep options as given.
      const shuffledOptions = shuffleArray(q.options);

      // Ensure correct answer text maps to one of the shuffled options.
      // Special case: typeof null => typeof null is "object".
      // Our options are: "null","object","undefined","number" so correct answer option is "object".
      // In our bank we stored correctAnswer as '"object"' so normalize to 'object'.
      return {
        question: q.question,
        options: shuffledOptions,
        correctAnswer: normalizedCorrect,
      };
    });

    // Rebuild userAnswers state.
    userAnswers = new Array(questions.length).fill(null).map(() => ({
      selectedIndex: null,
      locked: false,
    }));

    currentIndex = 0;
    quizStarted = true;

    // Reset UI
    reviewList.innerHTML = '';

    renderQuestion();
    startTimer();
    updateCounterAndProgress();
  }

  function updateCounterAndProgress() {
    const total = questions.length;
    questionCounter.textContent = `Question ${currentIndex + 1} of ${total}`;
    setProgress();
  }

  function renderQuestion() {
    const q = questions[currentIndex];
    if (!q) return;

    updateCounterAndProgress();

    questionTextEl.textContent = q.question;

    // Render options
    q.options.forEach((opt, idx) => {
      optTextEls[idx].textContent = opt;
    });

    clearOptionStates();

    // Enable only if not locked.
    const answer = userAnswers[currentIndex];
    if (answer.locked) {
      setOptionsDisabled(true);
      lockCurrentAnswerUI();
    } else {
      setOptionsDisabled(false);
      // If already selected (but not locked), show selection
      updateOptionSelectionUI(answer.selectedIndex);
    }

    // Timer should run only if not locked.
    if (!answer.locked) {
      startTimer();
    } else {
      stopTimer();
      // Remaining time irrelevant when locked; keep display stable.
      timeLeftEl.textContent = '0';
    }
  }

  function handleSelect(optionIndex) {
    const answer = userAnswers[currentIndex];
    if (!quizStarted || answer.locked) return;

    userAnswers[currentIndex].selectedIndex = optionIndex;
    updateOptionSelectionUI(optionIndex);
  }

  function scoreQuiz() {
    let correct = 0;
    let wrong = 0;

    questions.forEach((q, idx) => {
      const ans = userAnswers[idx]?.selectedIndex;
      const selectedOption = ans === null ? null : q.options[ans];
      const isCorrect = selectedOption === q.correctAnswer;
      if (isCorrect) correct += 1;
      else wrong += 1;
    });

    const total = questions.length;
    const score = correct; // 1 mark per correct
    const percent = total ? Math.round((correct / total) * 100) : 0;

    return { total, correct, wrong, score, percent };
  }

  function performanceMessage(percent) {
    if (percent >= 90) return 'Excellent';
    if (percent >= 70) return 'Very Good';
    if (percent >= 50) return 'Good';
    return 'Needs Improvement';
  }

  function setBadgeStyle(msg) {
    // Minimal inline changes for clarity
    if (msg === 'Excellent') perfBadge.style.borderColor = 'rgba(34,197,94,.55)';
    else if (msg === 'Very Good') perfBadge.style.borderColor = 'rgba(251,191,36,.55)';
    else if (msg === 'Good') perfBadge.style.borderColor = 'rgba(99,102,241,.55)';
    else perfBadge.style.borderColor = 'rgba(220,38,38,.55)';
  }

  function renderResult() {
    const { total, correct, wrong, score, percent } = scoreQuiz();

    statTotal.textContent = String(total);
    statCorrect.textContent = String(correct);
    statWrong.textContent = String(wrong);
    statPercent.textContent = `${percent}%`;
    statScore.textContent = `${score} / ${total}`;

    const msg = performanceMessage(percent);
    perfBadge.textContent = `${msg} · ${percent}%`;
    setBadgeStyle(msg);

    // Confetti if score above 80%
    if (percent > 80) {
      triggerConfetti(1100);
    }

    // Update best score
    const bestKey = 'quizApp_bestPercent';
    const existing = Number(localStorage.getItem(bestKey) ?? '-1');
    const bestPrev = Number.isFinite(existing) ? existing : -1;

    let bestNow = percent;
    let isNew = percent > bestPrev;

    if (isNew) {
      localStorage.setItem(bestKey, String(bestNow));
    }

    bestScoreEl.textContent = bestPrev >= 0 ? `${Math.max(bestPrev, percent)}%` : `${percent}%`;

    if (isNew) {
      bestUpdate.textContent = `New Best! Your best score is now ${percent}%.`;
      bestUpdate.style.color = 'rgba(34,197,94,.95)';
      bestUpdate.style.fontWeight = '900';
    } else {
      bestUpdate.textContent = `Best remains ${bestPrev >= 0 ? bestPrev + '%' : '—'}.`;
      bestUpdate.style.color = 'rgba(255,255,255,.86)';
      bestUpdate.style.fontWeight = '800';
    }
  }

  function renderReview() {
    reviewList.innerHTML = '';

    questions.forEach((q, idx) => {
      const ans = userAnswers[idx];
      const selectedIndex = ans?.selectedIndex;
      const userAnswer = selectedIndex === null ? 'No answer' : q.options[selectedIndex];
      const correctAnswer = q.correctAnswer;
      const isCorrect = userAnswer === correctAnswer;

      const item = document.createElement('div');
      item.className = 'review-item';

      const qEl = document.createElement('div');
      qEl.className = 'review-item__q';
      qEl.textContent = `Q${idx + 1}: ${q.question}`;

      const row1 = document.createElement('div');
      row1.className = 'review-item__row';

      const lab1 = document.createElement('div');
      lab1.className = 'review-item__label';
      lab1.textContent = 'Your Answer';

      const ans1 = document.createElement('div');
      ans1.className = `review-item__ans ${isCorrect ? 'good' : 'bad'}`;
      ans1.textContent = userAnswer;

      const lab2 = document.createElement('div');
      lab2.className = 'review-item__label';
      lab2.textContent = 'Correct Answer';

      const ans2 = document.createElement('div');
      ans2.className = 'review-item__ans good';
      ans2.textContent = correctAnswer;

      row1.appendChild(lab1);
      row1.appendChild(ans1);
      row1.appendChild(lab2);
      row1.appendChild(ans2);

      item.appendChild(qEl);
      item.appendChild(row1);
      reviewList.appendChild(item);
    });
  }

  function handleNext(fromTimer = false) {
    const answer = userAnswers[currentIndex];
    if (!answer) return;

    // Lock answer when moving next
    if (!answer.locked) {
      answer.locked = true;

      // If next is triggered by timer, we keep whatever selection exists (possibly null).
      // Visual locking
      lockCurrentAnswerUI();

      stopTimer();
    }

    // Move index forward
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      // Finished quiz
      quizStarted = false;
      setView(screenResult);
      renderResult();
      return;
    }

    currentIndex = nextIndex;
    renderQuestion();
    updateCounterAndProgress();
  }

  function handlePrev() {
    const answer = userAnswers[currentIndex];
    if (!answer) return;

    // Allow going back even if locked, to review previously locked answer.
    // Do not re-open timer if locked.

    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) return;

    currentIndex = prevIndex;
    renderQuestion();
    updateCounterAndProgress();
  }

  // ===================== Confetti =====================
  let confettiRunning = false;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    confettiCanvas.width = Math.floor(window.innerWidth * dpr);
    confettiCanvas.height = Math.floor(window.innerHeight * dpr);
    confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function triggerConfetti(durationMs = 900) {
    if (confettiRunning) return;
    confettiRunning = true;

    resizeCanvas();

    const colors = ['#22c55e', '#fbbf24', '#6366f1', '#fb7185', '#60a5fa'];

    const pieces = Array.from({ length: 140 }).map(() => ({
      x: rand(0, window.innerWidth),
      y: rand(-window.innerHeight * 0.2, 0),
      w: rand(6, 10),
      h: rand(10, 16),
      vx: rand(-1.5, 1.5),
      vy: rand(2.5, 5.5),
      rot: rand(0, Math.PI),
      vr: rand(-0.25, 0.25),
      color: colors[Math.floor(rand(0, colors.length))],
      life: rand(0.7, 1.2)
    }));

    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      const t = clamp(elapsed / durationMs, 0, 1);

      confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Slight fade
      confettiCtx.globalAlpha = 1 - t * 0.85;

      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.02; // gravity

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
      });

      confettiCtx.globalAlpha = 1;

      if (t < 1) {
        window.requestAnimationFrame(frame);
      } else {
        confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        confettiRunning = false;
      }
    }

    window.requestAnimationFrame(frame);
  }

  // ===================== Keyboard Shortcuts =====================
  function onKeyDown(e) {
    // Avoid interfering while user is holding keys in a button? Still fine.
    if (!quizStarted) {
      // If quiz isn't started, Enter should do nothing.
      return;
    }

    const key = e.key.toLowerCase();

    // Select options
    if (key === 'a' || key === 'b' || key === 'c' || key === 'd') {
      const idx = 'abcd'.indexOf(key);
      // Prevent accidental page scroll
      e.preventDefault();
      handleSelect(idx);
      return;
    }

    // Next
    if (e.key === 'Enter') {
      e.preventDefault();
      const answer = userAnswers[currentIndex];
      if (answer.locked) {
        // If already locked and user presses enter, just go next.
        handleNext(false);
      } else {
        // Lock and move next even if no selection.
        handleNext(false);
      }
    }
  }

  // ===================== Theme & LocalStorage =====================
  function initTheme() {
    const themeKey = 'quizApp_theme';
    const saved = localStorage.getItem(themeKey);
    const body = document.body;

    const theme = saved === 'dark' || saved === 'light' ? saved : 'light';
    body.setAttribute('data-theme', theme);
  }

  function initBestScore() {
    const bestKey = 'quizApp_bestPercent';
    const existing = Number(localStorage.getItem(bestKey) ?? '-1');
    if (!Number.isFinite(existing) || existing < 0) bestScoreEl.textContent = '—';
    else bestScoreEl.textContent = `${existing}%`;
  }

  function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', next);
    localStorage.setItem('quizApp_theme', next);
  }

  function clearBestScore() {
    localStorage.removeItem('quizApp_bestPercent');
    bestScoreEl.textContent = '—';
    bestUpdate.textContent = 'Best score cleared.';
    bestUpdate.style.color = 'rgba(255,255,255,.86)';
  }

  // ===================== Event Listeners =====================
  startBtn.addEventListener('click', () => {
    // Move to quiz screen
    setView(screenQuiz);
    // Start quiz
    prepareQuiz();
  });

  restartBtn.addEventListener('click', () => {
    setView(screenWelcome);
    quizStarted = false;
  });

  reviewRestartBtn.addEventListener('click', () => {
    setView(screenWelcome);
    quizStarted = false;
  });

  reviewBtn.addEventListener('click', () => {
    setView(screenReview);
    renderReview();
  });

  backToResultBtn.addEventListener('click', () => {
    setView(screenResult);
  });

  prevBtn.addEventListener('click', () => {
    handlePrev();
  });

  nextBtn.addEventListener('click', () => {
    handleNext(false);
  });

  resetBestBtn.addEventListener('click', () => {
    clearBestScore();
  });

  themeToggle.addEventListener('click', () => {
    toggleTheme();
  });

  optButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.opt);
      handleSelect(idx);
    });
  });

  document.addEventListener('keydown', onKeyDown);

  // ===================== Init =====================
  initTheme();
  initBestScore();
  setView(screenWelcome);

})();

