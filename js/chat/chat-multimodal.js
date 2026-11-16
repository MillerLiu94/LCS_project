(function () {
  "use strict";

  var form = document.getElementById("home-chat-form");
  var input = document.getElementById("prompt");
  var files = document.getElementById("chat-images");
  var picker = document.getElementById("chat-select-image");
  var preview = document.getElementById("chat-attachments");
  var voice = document.getElementById("chat-voice-input");
  var status = document.getElementById("chat-status");
  if (!form || !input || !files || !picker || !preview || !voice) return;

  var images = [];
  var pending = false;
  var uploadVersion = 0;
  var composerBusy = false;
  var maxImages = 4;

  function announce(message) { if (status) status.textContent = message; }
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
      remove.textContent = "×";
      remove.addEventListener("click", function () {
        images.splice(index, 1);
        renderImages();
        announce("已移除圖片。");
      });
      tile.append(image, remove);
      preview.appendChild(tile);
    });
    document.dispatchEvent(new Event("chat-multimodal-change"));
  }
  picker.addEventListener("click", function () { files.click(); });
  files.addEventListener("change", function () {
    if (pending) return;
    var selected = Array.from(files.files || []);
    files.value = "";
    if (images.length + selected.length > maxImages) {
      announce("最多可加入 4 張圖片。");
      return;
    }
    pending = selected.length > 0;
    var version = ++uploadVersion;
    picker.disabled = pending;
    if (pending) announce("正在處理圖片…");
    selected.reduce(function (queue, file) {
      return queue.then(function () {
        if (!file.type || file.type.indexOf("image/") !== 0) throw new Error("請選擇圖片檔案。");
        return resizeImage(file).then(function (item) {
          if (version !== uploadVersion) return;
          images.push(item);
          renderImages();
        });
      });
    }, Promise.resolve()).then(function () {
      if (version === uploadVersion && selected.length) announce("已加入 " + selected.length + " 張圖片。");
    }).catch(function (error) {
      if (version !== uploadVersion) return;
      announce(error.message || "讀取圖片失敗，請再試一次。");
    }).finally(function () {
      if (version !== uploadVersion) return;
      pending = false;
      picker.disabled = false;
      document.dispatchEvent(new Event("chat-multimodal-change"));
    });
  });

  var voiceRecorder = window.CommunityAudioRecorder.bind(voice, {
    onText: function (transcript) {
      input.value = input.value.trim() ? input.value.trimEnd() + " " + transcript : transcript;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      announce("語音已轉成文字，可以編輯後送出。");
    },
    onStatus: announce,
  });
  window.ChatMultimodal = {
    getImages: function () { return images.slice(); },
    hasImages: function () { return images.length > 0; },
    isProcessing: function () { return pending; },
    clear: function () {
      uploadVersion += 1;
      pending = false;
      picker.disabled = composerBusy;
      images = [];
      renderImages();
    },
    setBusy: function (busy) {
      composerBusy = busy;
      picker.disabled = busy || pending;
      if (voiceRecorder) voiceRecorder.setBusy(busy);
    }
  };
})();
