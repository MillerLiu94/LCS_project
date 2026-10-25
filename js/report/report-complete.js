(function () {
  "use strict";

  var flow = window.ReportFlow;
  var draft = flow.getDraft();
  var created = draft.createdCase;
  var status = document.getElementById("complete-status");

  if (!created || !created.cases_id) {
    status.hidden = false;
    status.textContent = "沒有找到成功建立的案件資料。請從首頁重新開始申報。";
    return;
  }

  document.getElementById("event-id").textContent = String(created.cases_id);
  document.getElementById("case-location").textContent = draft.caseLocationText ||
    (created.address || "未提供");
  document.getElementById("case-category").textContent =
    (draft.analysis && (draft.analysis.label || draft.analysis.key_name)) || String(created.category_id);
  document.getElementById("case-description").textContent =
    draft.descriptionOverride || created.description || (draft.analysis && draft.analysis.description) || "";
})();