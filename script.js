const modal = document.getElementById("costQuiz");
const openButtons = document.querySelectorAll("[data-open-cost]");
const closeButtons = document.querySelectorAll("[data-close-cost]");
const form = document.getElementById("costForm");
const steps = Array.from(document.querySelectorAll(".quiz-step"));
const prevButton = document.querySelector(".quiz-prev");
const nextButton = document.querySelector(".quiz-next");
const progressBar = document.querySelector(".quiz-progress__bar");
const currentStepText = document.getElementById("quizStepCurrent");
const totalStepText = document.getElementById("quizStepTotal");
const result = document.querySelector(".quiz-result");
const summaryField = document.getElementById("quizSummary");

let currentStep = 0;
let closeResultTimer;

totalStepText.textContent = String(steps.length);

function setStep(index) {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));

    steps.forEach((step, stepIndex) => {
        step.classList.toggle("is-active", stepIndex === currentStep);
    });

    currentStepText.textContent = String(currentStep + 1);
    progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    prevButton.disabled = currentStep === 0;
    nextButton.textContent = currentStep === steps.length - 1 ? "Отправить заявку" : "Следующий вопрос →";
}

function openModal() {
    clearTimeout(closeResultTimer);
    form.reset();
    result.hidden = true;
    document.querySelector(".quiz-footer").hidden = false;
    summaryField.value = "";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("quiz-lock");
    setStep(0);
    setTimeout(() => nextButton.focus(), 0);
}

function closeModal() {
    clearTimeout(closeResultTimer);
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("quiz-lock");
}

function validateCurrentStep() {
    const fields = Array.from(steps[currentStep].querySelectorAll("input, textarea"));
    const radioNames = new Set();

    for (const field of fields) {
        if (field.type === "radio") {
            if (radioNames.has(field.name)) {
                continue;
            }
            radioNames.add(field.name);
            const checkedRadio = steps[currentStep].querySelector(`input[name="${field.name}"]:checked`);
            if (field.required && !checkedRadio) {
                field.reportValidity();
                return false;
            }
            continue;
        }

        if (!field.checkValidity()) {
            field.reportValidity();
            return false;
        }
    }

    return true;
}

function getFormValue(name) {
    const data = new FormData(form);
    return String(data.get(name) || "").trim();
}

function buildSummary() {
    const about = getFormValue("about");

    return [
        "Заявка на расчет стоимости",
        "",
        `Подарок: ${getFormValue("gift")}`,
        `Имя: ${getFormValue("name")}`,
        `Возраст: ${getFormValue("age")}`,
        `Направление: ${getFormValue("direction")}`,
        `О себе: ${about || "Не указано"}`,
        `Где связаться: ${getFormValue("contact")}`
    ].join("\n");
}

function showResult() {
    const summary = buildSummary();

    summaryField.value = summary;
    steps.forEach((step) => step.classList.remove("is-active"));
    result.hidden = false;
    document.querySelector(".quiz-footer").hidden = true;
    progressBar.style.width = "100%";

    if (navigator.clipboard) {
        navigator.clipboard.writeText(summary).catch(() => {});
    }

    closeResultTimer = setTimeout(closeModal, 7000);
}

openButtons.forEach((button) => {
    button.addEventListener("click", openModal);
});

closeButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
});

prevButton.addEventListener("click", () => {
    setStep(currentStep - 1);
});

nextButton.addEventListener("click", () => {
    if (!validateCurrentStep()) {
        return;
    }

    if (currentStep === steps.length - 1) {
        form.requestSubmit();
        return;
    }

    setStep(currentStep + 1);
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateCurrentStep()) {
        return;
    }

    showResult();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
        closeModal();
    }
});
