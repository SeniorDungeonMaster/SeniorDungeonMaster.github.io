document.addEventListener("DOMContentLoaded", () => {
    
    const TELEGRAM_BOT_TOKEN_PARTS = [
        "/8928965855:",
        "AAGhEEaRqv48p1zIDyhE9T5rAy-0iJtX7-U"    
    ];
    const TELEGRAM_CHAT_IDS = [
        "552994309"
    ];

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

    function getTelegramBotToken() {
        return TELEGRAM_BOT_TOKEN_PARTS.join("").trim();
    }

    function getTelegramChatIds() {
        return TELEGRAM_CHAT_IDS.map((chatId) => String(chatId).trim()).filter(Boolean);
    }

    function getNextButtonText() {
        return currentStep === steps.length - 1 ? "Отправить заявку" : "Следующий вопрос →";
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
            contact: getFormValue("contact")
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

    function copySummary(summary) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(summary).catch(() => {});
        }
    }

    function telegramIsConfigured() {
        const token = getTelegramBotToken();
        const chatIds = getTelegramChatIds();

        return Boolean(token) &&
            !token.includes("PASTE_") &&
            chatIds.length > 0 &&
            chatIds.every((chatId) => !chatId.includes("PASTE_"));
    }

    async function sendTelegramMessage(text) {
        if (!telegramIsConfigured()) {
            throw new Error("telegram_not_configured");
        }

        const token = getTelegramBotToken();
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const requests = getTelegramChatIds().map((chatId) => {
            const body = new URLSearchParams({
                chat_id: chatId,
                text,
                disable_web_page_preview: "true"
            });

            return fetch(url, {
                method: "POST",
                mode: "no-cors",
                body
            });
        });

        await Promise.all(requests);
    }

    async function showResult() {
        const payload = buildPayload();
        const summary = buildSummary(payload);

        summaryField.value = summary;
        copySummary(summary);
        setSending(true);

        try {
            await sendTelegramMessage(summary);
            closeModal();
            openThanksModal();
        } catch (error) {
            console.error(error);
            setError("Не получилось отправить заявку. Проверьте токен и chat_id Telegram-бота.");
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
