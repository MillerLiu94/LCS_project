(function () {
  "use strict";

  var query = "";
  var caseFlow = new URLSearchParams(window.location.search).get("target") === "cases";
  try { query = sessionStorage.getItem("communityLocalInfoQuery") || ""; } catch (_) {}
  var context = document.getElementById("query-context");
  var title = document.getElementById("loading-title");
  if (caseFlow) {
    document.title = "正在分析附近社區事件｜社區小尖兵";
    title.textContent = "AI 正在分析附近的社區事件…";
    context.textContent = "正在整理居民回報的案件與處理進度";
  } else if (query) context.textContent = "正在整理「" + query + "」的查詢結果";

  window.setTimeout(function () {
    window.location.replace(caseFlow ? "cases.html" : "activities.html");
  }, 1800);
})();
