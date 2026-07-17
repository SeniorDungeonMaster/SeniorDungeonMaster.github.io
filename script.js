document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("costQuiz");
    const thanksModal = document.getElementById("thanksPopup");
    const openButtons = document.querySelectorAll("[data-open-cost]");
    const closeButtons = document.querySelectorAll("[data-close-cost]");
    const thanksCloseButtons = document.querySelectorAll("[data-close-thanks]");
    const form = document.getElementById("costForm");
    const steps = Array.from(document.querySelectorAll(".quiz-step"));
    const prevButton = document.querySelector(".quiz-prev");
    const nextButton = document.querySelector(".quiz-next");
    const progressBar = document.querySelector(".quiz-progress__bar");
    const currentStepText = document.getElementById("quizStepCurrent");
    const totalStepText = document.getElementById("quizStepTotal");
    const summaryField = document.getElementById("quizSummary");
    const quizFooter = document.querySelector(".quiz-footer");
    const quizError = document.getElementById("quizError");

    if (!modal || !form || !prevButton || !nextButton || !progressBar || !currentStepText || !totalStepText || !summaryField || !quizFooter || steps.length === 0) {
        return;
    }

    let currentStep = 0;
    let thanksCloseTimer;
    let isSending = false;

    totalStepText.textContent = String(steps.length);

    function getLeadApiUrl() {
        return form.dataset.apiUrl || window.LEAD_API_URL || "";
    }

    function setError(message = "") {
        if (!quizError) {
            return;
        }

        quizError.textContent = message;
        quizError.hidden = !message;
    }

    function setSending(sending) {
        isSending = sending;
        prevButton.disabled = sending || currentStep === 0;
        nextButton.disabled = sending;
        nextButton.textContent = sending ? "Отправляем..." : getNextButtonText();
    }

    function getNextButtonText() {
        return currentStep === steps.length - 1 ? "Отправить заявку" : "Следующий вопрос →";
    }

    function setStep(index) {
        currentStep = Math.max(0, Math.min(index, steps.length - 1));

        steps.forEach((step, stepIndex) => {
            step.classList.toggle("is-active", stepIndex === currentStep);
        });

        currentStepText.textContent = String(currentStep + 1);
        progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
        prevButton.disabled = currentStep === 0;
        nextButton.textContent = getNextButtonText();
        setError("");
    }

    function openModal() {
        closeThanksModal();
        form.reset();
        quizFooter.hidden = false;
        summaryField.value = "";
        setError("");
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("quiz-lock");
        setStep(0);
        setTimeout(() => nextButton.focus(), 0);
    }

    function closeModal() {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");

        if (!thanksModal || !thanksModal.classList.contains("is-open")) {
            document.body.classList.remove("quiz-lock");
        }
    }

    function openThanksModal() {
        if (!thanksModal) {
            return;
        }

        clearTimeout(thanksCloseTimer);
        thanksModal.classList.add("is-open");
        thanksModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("quiz-lock");
        thanksCloseTimer = setTimeout(closeThanksModal, 7000);
    }

    function closeThanksModal() {
        clearTimeout(thanksCloseTimer);

        if (!thanksModal) {
            return;
        }

        thanksModal.classList.remove("is-open");
        thanksModal.setAttribute("aria-hidden", "true");

        if (!modal.classList.contains("is-open")) {
            document.body.classList.remove("quiz-lock");
        }
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

                if (field.required && !steps[currentStep].querySelector(`input[name="${field.name}"]:checked`)) {
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

    function buildPayload() {
        return {
            gift: getFormValue("gift"),
            name: getFormValue("name"),
            age: getFormValue("age"),
            direction: getFormValue("direction"),
            about: getFormValue("about"),
            contact: getFormValue("contact"),
            page: window.location.href
        };
    }

    function buildSummary(payload) {
        return [
            "Заявка на расчет стоимости",
            "",
            `Подарок: ${payload.gift}`,
            `Имя: ${payload.name}`,
            `Возраст: ${payload.age}`,
            `Направление: ${payload.direction}`,
            `О себе: ${payload.about || "Не указано"}`,
            `Где связаться: ${payload.contact}`
        ].join("\n");
    }

    async function sendLead(payload) {
        const apiUrl = getLeadApiUrl();

        if (!apiUrl) {
            return;
        }

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Lead API returned ${response.status}`);
        }
    }

    async function showResult() {
        const payload = buildPayload();
        const summary = buildSummary(payload);

        summaryField.value = summary;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(summary).catch(() => {});
        }

        setSending(true);

        try {
            await sendLead(payload);
            closeModal();
            openThanksModal();
        } catch (error) {
            console.error(error);
            setError("Не получилось отправить заявку. Проверьте интернет и попробуйте ещё раз.");
        } finally {
            setSending(false);
        }
    }

    openButtons.forEach((button) => {
        button.addEventListener("click", openModal);
    });

    closeButtons.forEach((button) => {
        button.addEventListener("click", closeModal);
    });

    thanksCloseButtons.forEach((button) => {
        button.addEventListener("click", closeThanksModal);
    });

    prevButton.addEventListener("click", () => {
        if (!isSending) {
            setStep(currentStep - 1);
        }
    });

    nextButton.addEventListener("click", () => {
        if (isSending || !validateCurrentStep()) {
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

        if (isSending || !validateCurrentStep()) {
            return;
        }

        showResult();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }

        if (thanksModal && thanksModal.classList.contains("is-open")) {
            closeThanksModal();
            return;
        }

        if (modal.classList.contains("is-open")) {
            closeModal();
        }
    });
});
