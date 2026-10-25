(function () {
  "use strict";

  var form = document.getElementById("home-chat-form");
  var input = document.getElementById("prompt");
  var send = document.getElementById("chat-send");
  var list = document.getElementById("message-list");
  var scroll = document.getElementById("chat-scroll");
  var welcome = document.getElementById("welcome-card");
  var status = document.getElementById("chat-status");
  var connection = document.getElementById("connection-status");
  if (!form || !input || !send || !list || !scroll) return;

  var history = [];
  var activeController = null;
  var busy = false;
  var shouldFollow = true;
  var scrollScheduled = false;

  function setStatus(message) { status.textContent = message; }
  function scrollToLatest(force) {
    if (force) shouldFollow = true;
    if (!shouldFollow || scrollScheduled) return;
    scrollScheduled = true;
    window.requestAnimationFrame(function () {
      scrollScheduled = false;
      var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scroll.scrollTo({ top: scroll.scrollHeight, behavior: reduced || !force ? "auto" : "smooth" });
    });
  }
  function updateSendButton() {
    send.disabled = !busy && !input.value.trim();
    send.setAttribute("aria-label", busy ? "停止生成" : "送出訊息");
    send.innerHTML = busy
      ? '<span>停止生成</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>'
      : '<span>送出訊息</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
  }
  function showError(message, prompt, assistant) {
    assistant.row.classList.remove("message--streaming");
    var error = document.createElement("div");
    error.className = "message-error";
    var detail = document.createElement("span");
    detail.textContent = message;
    var retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "重新嘗試";
    retry.addEventListener("click", function () { sendMessage(prompt, assistant, true); });
    error.append(detail, retry);
    assistant.content.appendChild(error);
    assistant.error = error;
  }
  function readError(response) {
    return response.text().then(function (text) {
      var data;
      try { data = JSON.parse(text); } catch (_) { data = null; }
      throw new Error((data && (data.detail || data.error || data.message)) || text || "AI 服務暫時無法使用，請稍後再試。");
    });
  }
  function sendMessage(prompt, retryTarget, isRetry) {
    var message = String(prompt || "").trim();
    if (!message || busy) return;
    welcome.hidden = true;
    if (!isRetry) window.ChatMessages.createUser(list, message);
    var assistant = window.ChatMessages.createAssistant(list, retryTarget);
    assistant.reportIntent = isRetry ? assistant.reportIntent : window.ChatMessages.hasReportIntent(message);
    var requestMessages = history.concat([{ role: "user", content: message }]);
    var controller = new AbortController();
    activeController = controller;
    busy = true;
    connection.textContent = "正在回覆";
    setStatus("AI 正在整理回覆…");
    updateSendButton();
    scrollToLatest(true);

    window.CommunityApi.streamChat(message, requestMessages, controller.signal)
      .then(function (response) {
        if (!response.ok) return readError(response);
        return window.ChatStream.consume(response, function (chunk) {
          if (!chunk || controller.signal.aborted) return;
          assistant.indicator.hidden = true;
          assistant.text.textContent += chunk;
          scrollToLatest();
        });
      })
      .then(function () {
        if (controller.signal.aborted || activeController !== controller) return;
        assistant.row.classList.remove("message--streaming");
        if (!assistant.text.textContent.trim()) throw new Error("目前沒有收到回覆，請重新嘗試。");
        if (assistant.reportIntent) window.ChatMessages.addReportAction(assistant);
        history = requestMessages.concat([{ role: "assistant", content: assistant.text.textContent }]);
        connection.textContent = "可以繼續提問";
        setStatus("回覆完成。AI 生成的內容可能有誤，請自行確認重要資訊。");
      })
      .catch(function (error) {
        if (activeController !== controller) return;
        assistant.indicator.hidden = true;
        if (error.name === "AbortError") {
          assistant.row.classList.remove("message--streaming");
          if (!assistant.text.textContent) assistant.text.textContent = "已停止生成。";
          history = requestMessages;
          connection.textContent = "已停止回覆";
          setStatus("已停止生成，可以繼續提問。");
        } else {
          connection.textContent = "連線遇到問題";
          setStatus("無法取得回覆，請確認連線後重試。");
          showError(error.message || "無法連線到 AI 服務。", message, assistant);
        }
      })
      .finally(function () {
        if (activeController !== controller) return;
        activeController = null;
        busy = false;
        updateSendButton();
      });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (busy) { activeController.abort(); return; }
    var message = input.value.trim();
    if (!message) return;
    input.value = "";
    input.style.height = "auto";
    updateSendButton();
    sendMessage(message);
  });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 220) + "px";
    updateSendButton();
  });
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!busy && input.value.trim()) form.requestSubmit();
    }
  });
  scroll.addEventListener("scroll", function () {
    shouldFollow = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 120;
  });
  document.querySelectorAll("[data-prompt]").forEach(function (button) {
    button.addEventListener("click", function () { sendMessage(button.dataset.prompt); });
  });
  function clearChat(keepFocus) {
    if (activeController) activeController.abort();
    activeController = null;
    busy = false;
    history = [];
    list.replaceChildren();
    welcome.hidden = false;
    connection.textContent = "準備為您服務";
    setStatus("AI 生成的內容可能有誤，請自行確認重要資訊。");
    updateSendButton();
    input.value = "";
    input.style.height = "auto";
    if (keepFocus !== false) input.focus();
  }
  document.getElementById("clear-chat").addEventListener("click", clearChat);
  updateSendButton();
  var firstMessage = "";
  try {
    firstMessage = window.sessionStorage.getItem("communityChatFirstPrompt") || "";
    window.sessionStorage.removeItem("communityChatFirstPrompt");
  } catch (_) { firstMessage = ""; }
  if (firstMessage.trim()) sendMessage(firstMessage);
})();
