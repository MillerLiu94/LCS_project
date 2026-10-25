(function () {
  "use strict";

  var form = document.getElementById("home-chat-form");
  var input = document.getElementById("prompt");
  var status = document.getElementById("home-chat-status");
  if (!form || !input) return;

  input.addEventListener("input", function () {
    status.textContent = "";
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 220) + "px";
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var message = input.value.trim();
    if (!message) {
      status.textContent = "請先輸入想詢問的內容。";
      input.focus();
      return;
    }
    try {
      window.sessionStorage.setItem("communityChatFirstPrompt", message);
      window.location.href = "./pages/chat/chat.html";
    } catch (_) {
      status.textContent = "目前無法開始對話，請重新整理後再試。";
    }
  });
})();
