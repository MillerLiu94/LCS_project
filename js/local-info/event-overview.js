(function () {
  "use strict";

  var list = document.getElementById("events-list");
  var count = document.getElementById("event-count");
  var status = document.getElementById("event-status");
  var retry = document.getElementById("retry-events");
  var pageSize = 10;
  var loaded = 0;
  var loading = false;
  var finished = false;
  var observer;

  function statusLabel(value) {
    return ({ reported: "已通報", "in-progress": "處理中", resolved: "已完成", pending: "待處理" })[value] || value || "處理中";
  }
  function normalizeEvent(event) {
    var reportedAt = event.reportedAt || "";
    var date = reportedAt ? new Date(reportedAt) : null;
    return {
      id: event.id,
      type: event.type || "社區事件",
      title: event.title || "社區事件",
      date: event.timeText || (date && !isNaN(date.getTime()) ? new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(date) : "時間未提供"),
      iso: date && !isNaN(date.getTime()) ? date.toISOString() : "",
      place: event.placeText || "地點未提供",
      status: statusLabel(event.status),
      detail: event.description || "尚未提供事件說明。",
      photo: window.CommunityApi.assetUrl(event.photo),
    };
  }
  function makeMeta(label, value, iso) {
    var row = document.createElement("p");
    var key = document.createElement("span");
    row.className = "case-meta";
    key.textContent = label;
    row.appendChild(key);
    if (iso) {
      var time = document.createElement("time");
      time.dateTime = iso;
      time.textContent = value;
      row.appendChild(time);
    } else row.appendChild(document.createTextNode(value));
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
    category.textContent = record.type;
    caseStatus.className = "case-status";
    caseStatus.textContent = record.status;
    title.className = "case-title";
    title.textContent = record.title;
    summary.textContent = "事件詳情";
    description.textContent = record.detail;
    top.append(category, caseStatus);
    details.className = "case-details";
    details.append(summary, description);
    if (record.photo) {
      var photo = document.createElement("img");
      photo.src = record.photo;
      photo.alt = record.title;
      photo.loading = "lazy";
      photo.className = "case-photo";
      card.appendChild(photo);
    }
    card.append(top, title, makeMeta("通報時間", record.date, record.iso), makeMeta("發生地點", record.place), details);
    details.addEventListener("toggle", function () {
      if (!details.open || !record.id || details.dataset.loaded) return;
      details.dataset.loaded = "true";
      description.textContent = "正在載入事件詳情…";
      window.CommunityApi.getEvent(record.id).then(function (result) {
        description.textContent = result ? normalizeEvent(result).detail : "找不到這筆事件資料。";
      }).catch(function () {
        details.dataset.loaded = "";
        description.textContent = record.detail;
      });
    });
    return card;
  }
  function watchNextBatch() {
    if (observer) observer.disconnect();
    if (finished) return;
    if (!window.IntersectionObserver) { retry.hidden = false; return; }
    var trigger = list.children[Math.min(list.children.length - 1, Math.max(0, loaded - pageSize + 6))];
    if (trigger) observer.observe(trigger);
  }
  function loadNextBatch() {
    if (loading || finished) return;
    loading = true;
    if (observer) observer.disconnect();
    retry.hidden = true;
    status.textContent = "正在載入社區事件…";
    window.CommunityApi.getEvents(loaded, pageSize, { time: "all" }).then(function (result) {
      var batch = Array.isArray(result) ? result : [];
      batch.map(normalizeEvent).forEach(function (record) { list.appendChild(makeCard(record)); });
      loaded += batch.length;
      count.textContent = "目前顯示 " + loaded + " 筆社區事件";
      finished = batch.length < pageSize;
      status.textContent = loaded ? (finished ? "已顯示全部事件。" : "") : "目前沒有社區事件。";
      if (!finished) watchNextBatch();
    }).catch(function (error) {
      status.textContent = error.message || "目前無法載入社區事件，請稍後重試。";
      retry.textContent = loaded ? "重試載入" : "重新載入";
      retry.hidden = false;
    }).finally(function () { loading = false; });
  }

  observer = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    if (entries.some(function (entry) { return entry.isIntersecting; })) loadNextBatch();
  }, { rootMargin: "0px", threshold: 0.8 }) : null;
  retry.addEventListener("click", loadNextBatch);
  loadNextBatch();
})();
