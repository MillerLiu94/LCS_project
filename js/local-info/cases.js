(function () {
  "use strict";

  var list = document.getElementById("cases-list");
  var moreButton = document.getElementById("show-more");
  var countLabel = document.getElementById("case-count");
  var status = document.getElementById("case-status");
  var regionLabel = document.getElementById("case-region");
  var pageSize = 8;
  var loaded = 0;
  var finished = false;
  var busy = false;
  var region = "";

  function statusLabel(value) {
    return ({ reported: "已通報", "in-progress": "處理中", resolved: "已完成", pending: "待處理" })[value] || value || "處理中";
  }
  function normalize(record) {
    var reportedAt = record.reportedAt || "";
    var date = reportedAt ? new Date(reportedAt) : null;
    return {
      id: record.id,
      category: record.type || "社區事件",
      title: record.title || record.type || "社區事件",
      date: record.timeText || (date && !isNaN(date.getTime()) ? new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(date) : "通報時間未提供"),
      iso: date && !isNaN(date.getTime()) ? date.toISOString() : "",
      place: record.placeText || "未提供地點",
      status: statusLabel(record.status),
      detail: record.description || "尚未提供事件說明。",
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
    var tag = document.createElement("span");
    var caseStatus = document.createElement("span");
    var title = document.createElement("h2");
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    var description = document.createElement("p");
    card.className = "case-card";
    top.className = "case-card__top";
    tag.className = "case-category";
    tag.textContent = record.category;
    caseStatus.className = "case-status";
    caseStatus.textContent = record.status;
    title.className = "case-title";
    title.textContent = record.title;
    summary.textContent = "案件詳情";
    description.textContent = record.detail;
    details.className = "case-details";
    details.append(summary, description);
    top.append(tag, caseStatus);
    card.append(top, title, makeMeta("申報時間", record.date, record.iso), makeMeta("發生地點", record.place), details);
    if (record.id) details.addEventListener("toggle", function () {
      if (!details.open || details.dataset.loaded) return;
      details.dataset.loaded = "true";
      window.CommunityApi.getEvent(record.id).then(function (result) {
        description.textContent = result ? normalize(result).detail : "找不到這筆事件資料。";
      }).catch(function () { details.dataset.loaded = ""; });
    });
    return card;
  }
  function loadNextPage() {
    if (busy || finished) return;
    busy = true;
    moreButton.disabled = true;
    status.textContent = "正在載入附近案件…";
    window.CommunityApi.getEvents(loaded, pageSize, { time: "all", filterRegion: region }).then(function (result) {
      var batch = Array.isArray(result) ? result : [];
      batch.map(normalize).forEach(function (record) { list.appendChild(makeCard(record)); });
      loaded += batch.length;
      countLabel.textContent = "目前顯示 " + loaded + " 件案件";
      finished = batch.length < pageSize;
      moreButton.hidden = finished;
      status.textContent = loaded ? (finished ? "已顯示全部附近案件。" : "") : "目前沒有附近案件。";
    }).catch(function (error) {
      status.textContent = error.message || "目前無法載入案件，請稍後重試。";
      moreButton.textContent = loaded ? "重試載入" : "重新載入案件";
      moreButton.hidden = false;
    }).finally(function () { busy = false; moreButton.disabled = false; });
  }

  try {
    var location = JSON.parse(sessionStorage.getItem("communityLocalInfoLocation") || "null");
    region = location && location.address || "";
  } catch (_) {}
  if (regionLabel) regionLabel.textContent = region || "附近社區";
  moreButton.addEventListener("click", loadNextPage);
  loadNextPage();
})();
