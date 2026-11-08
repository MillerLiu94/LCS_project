(function () {
  "use strict";

  var form = document.getElementById("home-chat-form");
  var input = document.getElementById("prompt");
  var status = document.getElementById("home-chat-status");
  var files = document.getElementById("prompt-images");
  var picker = document.getElementById("select-image");
  var preview = document.getElementById("home-attachments");
  var voice = document.getElementById("voice-input");
  if (!form || !input) return;

  var images = [];
  var maxImages = 4;

  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        try {
          var context = canvas.getContext("2d");
          if (!context) throw new Error("無法處理這張圖片。");
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve({ name: file.name, type: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", .82) });
        } catch (error) { reject(error); }
      };
      image.onerror = function () { URL.revokeObjectURL(url); reject(new Error("無法讀取這張圖片。")); };
      image.src = url;
    });
  }

  function renderImages() {
    preview.replaceChildren();
    preview.hidden = images.length === 0;
    images.forEach(function (item, index) {
      var tile = document.createElement("div");
      tile.className = "attachment-preview";
      var image = document.createElement("img");
      image.src = item.dataUrl;
      image.alt = item.name;
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "attachment-remove";
      remove.setAttribute("aria-label", "移除圖片「" + item.name + "」");
      remove.title = "移除圖片";
      remove.textContent = "×";
      remove.addEventListener("click", function () {
        images.splice(index, 1);
        renderImages();
        status.textContent = "已移除圖片。";
      });
      tile.append(image, remove);
      preview.appendChild(tile);
    });
  }

  if (picker && files) picker.addEventListener("click", function () { files.click(); });
  if (files) files.addEventListener("change", function () {
    var selected = Array.from(files.files || []);
    files.value = "";
    if (images.length + selected.length > maxImages) {
      status.textContent = "最多可加入 4 張圖片。";
      return;
    }
    selected.reduce(function (queue, file) {
      return queue.then(function () {
        if (!file.type || file.type.indexOf("image/") !== 0) throw new Error("請選擇圖片檔案。" );
        return resizeImage(file).then(function (item) { images.push(item); renderImages(); });
      });
    }, Promise.resolve()).then(function () {
      if (selected.length) status.textContent = "已加入 " + selected.length + " 張圖片。";
    }).catch(function (error) { status.textContent = error.message || "讀取圖片失敗，請再試一次。"; });
  });

  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (voice && Recognition) {
    var recognition = new Recognition();
    var heardVoice = false;
    recognition.lang = "zh-TW";
    recognition.interimResults = false;
    recognition.onstart = function () {
      heardVoice = false;
      voice.setAttribute("aria-pressed", "true");
      voice.setAttribute("aria-label", "停止語音輸入");
      status.textContent = "正在聆聽，請開始說話。";
    };
    recognition.onresult = function (event) {
      heardVoice = true;
      var transcript = event.results[0][0].transcript.trim();
      input.value = input.value.trim() ? input.value.trimEnd() + " " + transcript : transcript;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      status.textContent = "語音已轉成文字，可以編輯後送出。";
    };
    recognition.onerror = function (event) {
      status.textContent = event.error === "not-allowed" ? "請允許使用麥克風，再試一次。" : "語音辨識未完成，請再試一次或直接輸入。";
    };
    recognition.onend = function () {
      voice.setAttribute("aria-pressed", "false");
      voice.setAttribute("aria-label", "開始語音輸入");
      if (!heardVoice && status.textContent === "正在聆聽，請開始說話。") status.textContent = "沒有辨識到語音，請再試一次或直接輸入。";
    };
    voice.addEventListener("click", function () {
      if (voice.getAttribute("aria-pressed") === "true") recognition.stop();
      else { try { recognition.start(); } catch (_) { status.textContent = "語音輸入正在準備，請稍候再試。"; } }
    });
  } else if (voice) {
    voice.disabled = true;
    voice.title = "此瀏覽器不支援語音輸入";
    voice.setAttribute("aria-label", "此瀏覽器不支援語音輸入");
  }

  input.addEventListener("input", function () {
    status.textContent = "";
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 220) + "px";
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var message = input.value.trim();
    if (!message && !images.length) {
      status.textContent = "請輸入內容、選擇圖片，或使用語音輸入。";
      input.focus();
      return;
    }
    if (!message) message = "請看看我附上的圖片，並依照圖片內容回答。";
    try {
      var payload = { message: message, images: images };
      if (JSON.stringify(payload).length > 2400000) throw new Error("圖片資料較大，請移除部分圖片後再試。" );
      window.sessionStorage.setItem("communityChatFirstPrompt", JSON.stringify(payload));
      window.location.href = "./pages/chat/chat.html";
    } catch (error) {
      status.textContent = error.message || "目前無法開始對話，請重新整理後再試。";
    }
  });
})();
