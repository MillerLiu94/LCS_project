(function () {
  "use strict";

  var flow = window.ReportFlow;
  var draft = flow.getDraft();
  var category = document.getElementById("case-category");
  var location = document.getElementById("location-summary");
  var description = document.getElementById("description-input");
  var descriptionSummary = document.getElementById("description-summary");
  var voiceButton = document.getElementById("description-voice");
  var voiceStatus = document.getElementById("description-voice-status");
  var editButton = document.getElementById("apply-description");
  var submitButton = document.getElementById("submit-case");
  var status = document.getElementById("submit-status");
  var fieldError = document.getElementById("description-error");
  if (!category || !location || !description || !descriptionSummary || !editButton || !submitButton || !status || !fieldError) return;
  var submitting = false;

  function showStatus(message, error) {
    status.textContent = message;
    status.hidden = !message;
    status.setAttribute("role", error ? "alert" : "status");
  }

  function coordinateText(value) {
    return Number(value.lat).toFixed(6) + ", " + Number(value.lng).toFixed(6);
  }

  function render() {
    if (!draft.analysis || !Array.isArray(draft.uploadedPaths) || !draft.uploadedPaths.length) {
      showStatus("找不到完整的申報草稿，請返回重新選擇照片。", true);
      submitButton.disabled = true;
      return;
    }
    category.textContent = draft.analysis.label || draft.analysis.key_name || "已完成辨識";
    location.textContent = draft.location && (draft.location.address || coordinateText(draft.location)) || "尚未選擇地點";
    description.value = draft.descriptionOverride || draft.analysis.description || "";
    descriptionSummary.textContent = description.value;
  }

  function startEditing() {
    description.readOnly = false;
    description.setAttribute("aria-readonly", "false");
    editButton.textContent = "套用修改";
    description.focus();
  }

  editButton.addEventListener("click", function () {
    if (description.readOnly) { startEditing(); return; }
    var value = description.value.trim();
    if (value.length < 10) {
      fieldError.textContent = "描述至少需要 10 個字。";
      description.setAttribute("aria-invalid", "true");
      description.focus();
      return;
    }
    fieldError.textContent = "";
    description.removeAttribute("aria-invalid");
    description.readOnly = true;
    description.setAttribute("aria-readonly", "true");
    editButton.textContent = "修改";
    descriptionSummary.textContent = value;
    draft = flow.saveDraft({ descriptionOverride: value });
  });

  description.addEventListener("input", function () {
    fieldError.textContent = "";
    description.removeAttribute("aria-invalid");
  });

  function setupVoiceInput() {
    if (!voiceButton || !voiceStatus) return;
    window.CommunityAudioRecorder.bind(voiceButton, {
      onText: function (transcript) {
        if (description.readOnly) startEditing();
        description.value = description.value.trim()
          ? description.value.trimEnd() + " " + transcript : transcript;
        description.dispatchEvent(new Event("input", { bubbles: true }));
        voiceStatus.textContent = "語音已轉成文字，確認後請點「套用修改」。";
      },
      onStatus: function (message) { voiceStatus.textContent = message; },
    });
  }

  setupVoiceInput();

  submitButton.addEventListener("click", function () {
    if (submitting) return;
    var text = description.value.trim();
    var position = draft.location;
    var categoryId = Number(draft.analysis && draft.analysis.category_id);
    if (!draft.analysis || !Number.isInteger(categoryId) || categoryId <= 0 ||
        !Array.isArray(draft.uploadedPaths) || !draft.uploadedPaths.length) {
      showStatus("申報資料不完整，請返回重試。", true);
      return;
    }
    if (text.length < 10) {
      fieldError.textContent = "描述至少需要 10 個字。";
      description.setAttribute("aria-invalid", "true");
      description.focus();
      return;
    }
    if (!position || !Number.isFinite(Number(position.lat)) || !Number.isFinite(Number(position.lng))) {
      showStatus("請先確認申報地點。", true);
      return;
    }

    submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = "送出中…";
    showStatus("正在建立案件…");
    var payload = {
      description: text,
      category_id: categoryId,
      images: draft.uploadedPaths,
      address: position.address || coordinateText(position),
    };
    flow.createCase(payload).then(function (result) {
      if (!result || !result.cases_id) throw new Error("後端未回傳案件編號，請確認案件狀態後再操作。");
      flow.saveDraft({
        descriptionOverride: text,
        createdCase: result,
        caseLocationText: position.address || coordinateText(position),
      });
      return flow.clearFiles().catch(function () {});
    }).then(function () {
      window.location.href = "report-complete.html";
    }).catch(function (error) {
      showStatus(error.message || "送出失敗，請確認網路後重試。", true);
      submitting = false;
      submitButton.disabled = false;
      submitButton.textContent = "確認並送出";
    });
  });

  render();
})();
