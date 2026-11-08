(function () {
  "use strict";

  var list = document.getElementById("reports-list");
  var count = document.getElementById("report-count");
  var status = document.getElementById("report-status");
  var empty = document.getElementById("empty-state");
  var retry = document.getElementById("retry-reports");
  var pageSize = 10;
  var loaded = 0;
  var loading = false;
  var finished = false;
  var observer;

  function extractCases(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.cases)) return result.cases;
    if (result && Array.isArray(result.items)) return result.items;
    if (result && result.data && Array.isArray(result.data.cases)) return result.data.cases;
    if (result && Array.isArray(result.data)) return result.data;
    return [];
  }

  function formatDate(value) {
    if (!value) return "申報時間未提供";
    var date = new Date(value);
    if (isNaN(date.getTime()) || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value);
    return new Intl.DateTimeFormat("zh-TW", {
      month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(date);
  }

  function normalizeCase(record) {
    var location = record.address || record.place || record.location_text || "未提供地點";
    if (record.location && record.location.address) location = record.location.address;
    else if (typeof record.location === "string") location = record.location;
    return {
      category: record.category_name || record.category_label || record.category || record.key_name || "社區事件",
      title: record.title || record.event_title || record.category_name || record.category_label || "社區事件申報",
      reportedAt: formatDate(record.reportedAt || record.reported_at || record.createdAt || record.created_at),
      iso: record.iso || record.reported_at || record.created_at || "",
      place: location,
      status: record.status_label || record.status || "處理中",
      detail: record.detail || record.description || "未提供事件描述"
    };
  }

  function makeMeta(label, value) {
    var row = document.createElement("p");
    var key = document.createElement("span");
    row.className = "case-meta";
    key.textContent = label;
    row.append(key, document.createTextNode(value));
    return row;
  }

  function makeCard(record) {
    var card = document.createElement("article");
    var top = document.createElement("div");
    var category = document.createElement("span");
    var caseStatus = document.createElement("span");
    var title = document.createElement("h2");
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    var description = document.createElement("p");
    card.className = "case-card";
    top.className = "case-card__top";
    category.className = "case-category";
    category.textContent = record.category;
    caseStatus.className = "case-status";
    caseStatus.textContent = record.status;
    title.className = "case-title";
    title.textContent = record.title;
    details.className = "case-details";
    summary.textContent = "案件詳情";
    description.textContent = record.detail;
    top.append(category, caseStatus);
    details.append(summary, description);
    card.append(top, title, makeMeta("申報時間", record.reportedAt), makeMeta("發生地點", record.place), details);
    return card;
  }

  function watchNextBatch() {
    if (observer) observer.disconnect();
    if (finished) return;
    if (!window.IntersectionObserver) {
      retry.textContent = "載入更多紀錄";
      retry.hidden = false;
      return;
    }
    var trigger = list.children[Math.min(list.children.length - 1, loaded - pageSize + 6)];
    if (trigger && trigger !== empty) observer.observe(trigger);
  }

  function loadNextBatch() {
    if (loading || finished) return;
    loading = true;
    if (observer) observer.disconnect();
    retry.hidden = true;
    status.removeAttribute("data-error");
    status.textContent = "正在載入申報紀錄…";
    retry.textContent = "重新載入";
    window.CommunityApi.getMyCases(window.CommunityApi.authorAccount, loaded, pageSize).then(function (result) {
      var batch = extractCases(result);
      if (!batch.length) {
        finished = true;
        empty.hidden = loaded > 0;
        count.textContent = loaded ? "已顯示全部 " + loaded + " 筆申報紀錄" : "目前沒有申報紀錄";
        status.textContent = "";
        if (observer) observer.disconnect();
        return;
      }
      batch.map(normalizeCase).forEach(function (record) { list.appendChild(makeCard(record)); });
      loaded += batch.length;
      count.textContent = "目前顯示 " + loaded + " 筆申報紀錄";
      finished = result && typeof result.hasMore === "boolean" ? !result.hasMore : batch.length < pageSize;
      status.textContent = finished ? "已顯示全部申報紀錄" : "";
      if (!finished) watchNextBatch();
    }).catch(function () {
      status.dataset.error = "true";
      status.textContent = "目前無法取得您的申報紀錄，請稍後重試。";
      retry.textContent = "重試載入";
      retry.hidden = false;
    }).finally(function () {
      loading = false;
    });
  }

  if (window.IntersectionObserver) {
    observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) loadNextBatch();
    }, { rootMargin: "0px", threshold: 0.8 });
  } else retry.hidden = false;
  retry.addEventListener("click", loadNextBatch);
  loadNextBatch();
})();
