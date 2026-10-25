(function () {
  "use strict";

  var flow = window.ReportFlow;
  var cameraInput = document.getElementById("camera-input");
  var albumInput = document.getElementById("album-input");
  var startButton = document.getElementById("start-report");
  var previewContent = document.getElementById("photo-preview");
  var status = document.getElementById("photo-status");
  if (!cameraInput || !albumInput || !startButton || !previewContent || !status) return;

  var files = [];
  var objectUrls = [];

  function showStatus(message, isError) {
    status.textContent = message;
    status.setAttribute("role", isError ? "alert" : "status");
  }

  function clearObjectUrls() {
    objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    objectUrls = [];
  }

  function render() {
    clearObjectUrls();
    previewContent.replaceChildren();
    if (!files.length) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="8" y="11" width="48" height="42" rx="8"/><circle cx="23" cy="25" r="4"/><path d="m12 47 14-14 9 9 7-7 10 10"/></svg><p class="empty-title">圖片預覽</p><p class="empty-copy">可拍攝或從相簿選擇最多 5 張現場照片。</p>';
      previewContent.appendChild(empty);
      startButton.disabled = true;
      return;
    }

    var grid = document.createElement("div");
    grid.className = "photo-preview-grid";
    files.forEach(function (file, index) {
      var item = document.createElement("figure");
      item.className = "photo-preview-item";
      var image = document.createElement("img");
      var objectUrl = URL.createObjectURL(file);
      objectUrls.push(objectUrl);
      image.src = objectUrl;
      image.alt = "已選照片 " + (index + 1);
      var caption = document.createElement("figcaption");
      caption.textContent = file.name;
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "photo-remove";
      remove.textContent = "移除";
      remove.setAttribute("aria-label", "移除 " + file.name);
      remove.addEventListener("click", function () {
        files.splice(index, 1);
        persistAndRender();
      });
      item.append(image, caption, remove);
      grid.appendChild(item);
    });
    previewContent.appendChild(grid);
    startButton.disabled = false;
  }

  function persistAndRender() {
    render();
    flow.saveFiles(files).catch(function (error) { showStatus(error.message, true); });
    showStatus(files.length ? "已選擇 " + files.length + " 張照片。" : "", false);
  }

  function addFiles(list) {
    var incoming = Array.prototype.slice.call(list || []).filter(function (file) {
      return file.type.indexOf("image/") === 0;
    });
    var available = Math.max(0, 5 - files.length);
    files = files.concat(incoming.slice(0, available));
    if (incoming.length > available) showStatus("最多可選 5 張照片，已保留前 5 張。", true);
    else if (!incoming.length) showStatus("請選擇有效的圖片檔案。", true);
    else persistAndRender();
  }

  cameraInput.addEventListener("change", function () {
    addFiles(cameraInput.files);
    cameraInput.value = "";
  });
  albumInput.addEventListener("change", function () {
    addFiles(albumInput.files);
    albumInput.value = "";
  });
  startButton.addEventListener("click", function () {
    if (!files.length || startButton.disabled) return;
    startButton.disabled = true;
    flow.saveFiles(files).then(function () {
      flow.saveDraft({
        uploadedPaths: [],
        analysis: null,
        location: null,
        createdCase: null,
        descriptionOverride: null,
        caseLocationText: null,
      });
      window.location.href = "status-text-animation.html";
    }).catch(function (error) {
      startButton.disabled = false;
      showStatus(error.message, true);
    });
  });

  flow.getFiles().then(function (savedFiles) {
    files = savedFiles.slice(0, 5);
    render();
  }).catch(function (error) { showStatus(error.message, true); });
})();