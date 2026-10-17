
(() => {
  "use strict";

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const STORAGE_KEY = "ac_exam_live_v1";
  const PASS_PERCENT = 40;

  // Browser-safe Supabase configuration.
  // Never put a Supabase secret/service-role key in this file.
  const SUPABASE_URL =
    "https://tlsrvyqyhonnrlcdmlzo.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_znUuYPAf3U-FQoUtp4JRcA_kGZOIvoh";

  const START_URL =
    `${SUPABASE_URL}/functions/v1/exam-start`;

  const SUBMIT_URL =
    `${SUPABASE_URL}/functions/v1/exam-submit`;

  function getState() {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );
    } catch {
      return {};
    }
  }

  function setState(state) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]
    );
  }

  async function callFunction(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed (${response.status})`
      );
    }

    return data;
  }

  // ---------------------------------------
  // Student entry page
  // ---------------------------------------

  function entry() {
    const form = $("#entryForm");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const errorBox = $("#entryError");
      const button = form.querySelector(
        'button[type="submit"]'
      );

      const studentName =
        $("#studentName")?.value.trim() || "";

      const rollNumber =
        $("#rollNumber")?.value.trim() || "";

      const examCode =
        $("#examCode")?.value.trim() || "";

      if (errorBox) errorBox.textContent = "";

      if (!studentName || !rollNumber || !examCode) {
        if (errorBox) {
          errorBox.textContent =
            "Please complete all fields.";
        }
        return;
      }

      const oldText = button?.textContent || "Start Exam";

      if (button) {
        button.disabled = true;
        button.textContent = "Connecting to exam...";
      }

      try {
        const data = await callFunction(START_URL, {
          studentName,
          rollNumber,
          examCode
        });

        if (
          !data.attempt?.id ||
          !data.exam?.id ||
          !Array.isArray(data.questions) ||
          !data.questions.length
        ) {
          throw new Error(
            "Exam data is incomplete. Contact the administrator."
          );
        }

        setState({
          student: {
            name: studentName,
            roll: rollNumber
          },
          attempt: data.attempt,
          exam: data.exam,
          questions: data.questions,
          answers: {},
          flagged: [],
          started: false,
          startedAt: null,
          result: null
        });

        location.href = "instructions.html";

      } catch (error) {
        if (errorBox) {
          errorBox.textContent =
            error.message || "Unable to start the exam.";
        }

        if (button) {
          button.disabled = false;
          button.textContent = oldText;
        }
      }
    });
  }

  // ---------------------------------------
  // Instructions page
  // ---------------------------------------

  function instructions() {
    const button = $("#startExam");
    if (!button) return;

    const state = getState();

    if (
      !state.student ||
      !state.attempt?.id ||
      !state.questions?.length
    ) {
      location.href = "index.html";
      return;
    }

    const greeting = $("#studentGreeting");

    if (greeting) {
      greeting.textContent =
        `Student: ${state.student.name} • Roll: ${state.student.roll}`;
    }
    const duration = Number(state.exam?.duration_minutes || 30);
    const totalQuestions = state.questions.length;
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setText("examDuration", `${duration} minutes`);
    setText("examQuestionCount", `${totalQuestions} MCQs`);
    setText("examMaximumMarks", String(totalQuestions * Number(state.exam?.positive_marks ?? 4)));
    setText("examPositiveMarks", `+${Number(state.exam?.positive_marks ?? 4)} marks`);
    setText("examNegativeMarks", `−${Number(state.exam?.negative_marks ?? 1)} mark${Number(state.exam?.negative_marks ?? 1) === 1 ? "" : "s"}`);
    setText("examPassPercentage", `${Number(state.exam?.pass_percentage ?? PASS_PERCENT)}%`);
    if (state.exam?.instructions) { const box = document.getElementById("adminExamInstructions"); if (box) { box.hidden = false; box.textContent = state.exam.instructions; } }

    button.addEventListener("click", () => {
      const current = getState();

      current.started = true;
      current.startedAt = Date.now();
      current.answers = current.answers || {};
      current.flagged = current.flagged || [];

      setState(current);
      location.href = "test.html";
    });
  }

  // ---------------------------------------
  // Examination page
  // ---------------------------------------

  function test() {
    if (!$("#examApp")) return;

    let state = getState();

    if (
      !state.student ||
      !state.attempt?.id ||
      !state.started ||
      !state.questions?.length
    ) {
      location.href = "index.html";
      return;
    }

    const questions = state.questions;

    const durationSeconds = Math.max(
      60,
      Number(state.exam?.duration_minutes || 30) * 60
    );

    let index = 0;

    let remaining = Math.max(
      0,
      durationSeconds -
      Math.floor(
        (Date.now() - (state.startedAt || Date.now())) / 1000
      )
    );

    let submitting = false;
    let timerId;

    function render() {
      state = getState();

      const question = questions[index];
      if (!question) return;

      const selected = state.answers?.[question.id];

      $("#questionCount").textContent =
        `Question ${index + 1} of ${questions.length}`;

      $("#chapterName").textContent =
        question.chapter || "";

      $("#questionText").textContent =
        question.question_text || "";

      $("#options").innerHTML =
        (question.options || []).map(
          (option, optionIndex) => `
            <label class="option ${
              Number(selected) === optionIndex ? "selected" : ""
            }">
              <input
                type="radio"
                name="answer"
                value="${optionIndex}"
                ${
                  Number(selected) === optionIndex
                    ? "checked"
                    : ""
                }
              >
              <span>
                <b>${String.fromCharCode(65 + optionIndex)}.</b>
                ${escapeHtml(option)}
              </span>
            </label>
          `
        ).join("");

      $$("#options input").forEach((input) => {
        input.addEventListener("change", () => {
          const current = getState();

          current.answers = current.answers || {};

          current.answers[question.id] =
            Number(input.value);

          setState(current);
          render();
        });
      });

      $("#qnav").innerHTML = questions.map(
        (item, questionIndex) => `
          <button
            type="button"
            class="qnum ${
              questionIndex === index ? "current" : ""
            } ${
              state.answers?.[item.id] !== undefined
                ? "answered"
                : ""
            } ${
              (state.flagged || []).includes(questionIndex)
                ? "flagged"
                : ""
            }"
            data-q="${questionIndex}"
          >
            ${questionIndex + 1}
          </button>
        `
      ).join("");

      $$("#qnav button").forEach((button) => {
        button.addEventListener("click", () => {
          index = Number(button.dataset.q);
          render();
        });
      });

      $("#prevQ").disabled = index === 0;

      $("#nextQ").textContent =
        index === questions.length - 1
          ? "Review & Submit"
          : "Save & Next";

      $("#answeredCount").textContent =
        Object.keys(state.answers || {}).length;

      $("#flagBtn").textContent =
        (state.flagged || []).includes(index)
          ? "Unmark review"
          : "Mark for review";
    }

    async function submit(autoSubmitted = false) {
      if (submitting) return;

      submitting = true;
      $("#submitExam").disabled = true;
      $("#nextQ").disabled = true;

      try {
        const current = getState();

        const answers = Object.entries(
          current.answers || {}
        ).map(([questionId, selectedOption]) => ({
          questionId,
          selectedOption
        }));

        const data = await callFunction(SUBMIT_URL, {
          attemptId: current.attempt.id,
          answers
        });

        if (!data.success || !data.result) {
          throw new Error(
            data.error || "The server did not confirm the result."
          );
        }

        const serverResult = data.result;
        const cert = serverResult.certificate || serverResult.certificates || null;
        current.result = {
          ...serverResult,
          // Normalize response shapes from deployed Edge Function versions.
          answerReview: serverResult.answerReview || serverResult.answer_review || serverResult.review || [],
          certificateNo: serverResult.certificateNo || serverResult.certificate_no || cert?.certificate_no || cert?.certificateNo || null,
          certificateIssued: Boolean(serverResult.certificateIssued || serverResult.certificate_issued || serverResult.certificateNo || serverResult.certificate_no || cert?.certificate_no || cert?.certificateNo),
          result: serverResult.result || serverResult.status || (serverResult.passed === true ? "PASS" : serverResult.passed === false ? "FAIL" : undefined),
          autoSubmitted,
          completedAt: new Date().toISOString()
        };

        current.started = false;

        setState(current);

        if (timerId) clearInterval(timerId);

        location.href = "result.html";

      } catch (error) {
        submitting = false;

        $("#submitExam").disabled = false;
        $("#nextQ").disabled = false;

        alert(
          `Submission failed: ${
            error.message || "Please try again."
          }`
        );
      }
    }

    function clock() {
      const timer = $("#timer");

      if (timer) {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;

        timer.textContent =
          `${String(minutes).padStart(2, "0")}:` +
          `${String(seconds).padStart(2, "0")}`;

        if (remaining <= 300) {
          timer.classList.add("urgent");
        }
      }

      if (remaining <= 0) {
        submit(true);
      } else {
        remaining -= 1;
      }
    }

    $("#prevQ").addEventListener("click", () => {
      if (index > 0) {
        index -= 1;
        render();
      }
    });

    $("#nextQ").addEventListener("click", () => {
      if (index < questions.length - 1) {
        index += 1;
        render();
      } else {
        const unanswered =
          questions.length -
          Object.keys(getState().answers || {}).length;

        if (
          confirm(
            `Submit examination now? Unanswered: ${unanswered}`
          )
        ) {
          submit(false);
        }
      }
    });

    $("#flagBtn").addEventListener("click", () => {
      const current = getState();

      current.flagged = current.flagged || [];

      if (current.flagged.includes(index)) {
        current.flagged = current.flagged.filter(
          (item) => item !== index
        );
      } else {
        current.flagged.push(index);
      }

      setState(current);
      render();
    });

    $("#submitExam").addEventListener("click", () => {
      const unanswered =
        questions.length -
        Object.keys(getState().answers || {}).length;

      if (
        confirm(
          `Are you sure you want to submit? ${unanswered} unanswered question(s).`
        )
      ) {
        submit(false);
      }
    });

    render();
    clock();

    timerId = setInterval(() => {
      if (!submitting) clock();
    }, 1000);
  }

  // ---------------------------------------
  // Result page
  // ---------------------------------------

  function result() {
    const root = $("#resultApp");
    if (!root) return;

    const state = getState();

    if (!state.student || !state.result) {
      root.innerHTML = `
        <div class="card">
          <h2>No result found</h2>
          <a class="btn" href="index.html">Start exam</a>
        </div>
      `;
      return;
    }

    const resultData = state.result;

    const total = Number(
      resultData.totalQuestions ??
      state.questions?.length ??
      0
    );

    const max =
      total * Number(state.exam?.positive_marks ?? 4);

    const score = Number(resultData.score ?? 0);

    const percent = max > 0
      ? Math.max(0, score) / max * 100
      : 0;

    const passed = String(resultData.result || "").toUpperCase() === "PASS" || (!resultData.result && percent >= Number(state.exam?.pass_percentage ?? PASS_PERCENT));

    if ($("#resultStudent")) {
      $("#resultStudent").textContent = state.student.name;
    }

    if ($("#resultRoll")) {
      $("#resultRoll").textContent = state.student.roll;
    }

    if ($("#scoreValue")) {
      $("#scoreValue").textContent = String(score);
    }

    if ($("#scoreMax")) {
      $("#scoreMax").textContent = `/ ${max}`;
    }

    if ($("#passStatus")) {
      $("#passStatus").textContent =
        passed ? "PASS" : "NOT PASSED";

      $("#passStatus").className =
        passed ? "pass" : "fail";
    }

    if ($("#resultDate")) {
      $("#resultDate").textContent =
        new Date(
          resultData.completedAt || Date.now()
        ).toLocaleString();
    }

    const stats = [
      [
        "Correct",
        resultData.correctCount ??
        resultData.correct_count ??
        0
      ],
      [
        "Incorrect",
        resultData.wrongCount ??
        resultData.wrong_count ??
        0
      ],
      [
        "Unanswered",
        resultData.unansweredCount ??
        resultData.unanswered_count ??
        0
      ],
      ["Percentage", `${Math.round(percent)}%`]
    ];

    if ($("#stats")) {
      $("#stats").innerHTML = stats.map(
        ([label, value]) => `
          <div class="stat">
            <strong>${escapeHtml(value)}</strong>
            <span>${escapeHtml(label)}</span>
          </div>
        `
      ).join("");
    }

    if ($("#chapterResults")) {
      $("#chapterResults").innerHTML = "";
    }

    if ($("#answerReview")) {
      const review = resultData.answerReview || resultData.answer_review || resultData.review;
      if (Array.isArray(review) && review.length) {
        $("#answerReview").innerHTML = review.map((item, i) => {
          const selected = item.selectedOption ?? item.selected_option;
          const correct = item.correctOption ?? item.correct_option;
          const options = Array.isArray(item.options) ? item.options : [];
          const selectedText = selected == null ? "Not answered" : (options[selected] ?? selected);
          const correctText = correct == null ? "Unavailable" : (options[correct] ?? correct);
          const isCorrect = item.isCorrect === true || (selected != null && Number(selected) === Number(correct));
          return `<article class="rule" style="margin:10px 0;padding:14px;border-left:4px solid ${isCorrect ? '#16803d' : '#c0392b'}"><b>Q${escapeHtml(item.number ?? (i + 1))}. ${escapeHtml(item.question || item.question_text || "Question")}</b>${item.chapter ? `<p class="muted small">${escapeHtml(item.chapter)}</p>` : ""}<p>Your answer: ${escapeHtml(selectedText)}</p><p>Correct answer: ${escapeHtml(correctText)}</p><p class="muted">${escapeHtml(item.explanation || "")}</p></article>`;
        }).join("");
      } else {
        $("#answerReview").innerHTML =
          "<p>Answer review is not available for this attempt.</p>";
      }
    }

    if ($("#certificateLink")) {
      $("#certificateLink").href = "certificate.html";
    }
  }

  // ---------------------------------------
  // Certificate page
  // ---------------------------------------

  function certificate() {
    const root = $("#certificateApp");
    if (!root) return;
    const state = getState();
    const resultData = state.result;
    const total = Number(resultData?.totalQuestions ?? state.questions?.length ?? 0);
    const max = total * Number(state.exam?.positive_marks ?? 4);
    const score = Number(resultData?.score ?? 0);
    const percent = max > 0 ? Math.max(0, score) / max * 100 : 0;
    const certificateNo = resultData?.certificateNo || resultData?.certificate_no || resultData?.certificate?.certificate_no || resultData?.certificate?.certificateNo;
    const passed = String(resultData?.result || "").toUpperCase() === "PASS" || percent >= Number(state.exam?.pass_percentage ?? PASS_PERCENT);
    if (!state.student || !resultData || !passed || !certificateNo) {
      root.innerHTML = `<div class="card"><h2>Certificate unavailable</h2><p class="muted">A certificate is available only after the exam server confirms a passing result and issues a certificate number.</p><a class="btn" href="result.html">Back to result</a></div>`;
      return;
    }
    const put = (id, value) => { const el = $("#" + id); if (el) el.textContent = value ?? "—"; };
    put("certName", state.student.name || "Student");
    put("certNo", certificateNo);
    put("certExam", state.exam?.title || state.exam?.subject || "Online Examination");
    put("certCode", state.exam?.exam_code || state.exam?.code || state.exam?.examCode || "—");
    put("certScore", `${score} / ${total}`);
    put("certPercent", `${percent.toFixed(1)}%`);
    put("certResult", "PASS");
    put("certDate", new Date(resultData.completedAt || Date.now()).toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"}));
    const verifyUrl = `${location.origin}${location.pathname.replace(/certificate\.html$/, "verify-certificate.html")}?certificate=${encodeURIComponent(certificateNo)}`;
    const qr = $("#certQr");
    if (qr) { qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(verifyUrl)}`; qr.style.display = "block"; }
    const verifyLink = $("#verifyCertLink"); if (verifyLink) verifyLink.href = verifyUrl;
    const printButton = $("#printCert"); if (printButton && !printButton.dataset.bound) { printButton.dataset.bound = "1"; printButton.addEventListener("click", () => window.print()); }
  }

  // Admin authentication and dashboard are handled by the dedicated admin modules.

  document.addEventListener("DOMContentLoaded", () => {
    entry();
    instructions();
    test();
    result();
    certificate();
  });
})();
