(function () {
  "use strict";

  var list = document.getElementById("activities-list");
  var moreButton = document.getElementById("show-more");
  var countLabel = document.getElementById("activity-count");
  var remainingLabel = document.getElementById("remaining-count");
  var locationLabel = document.getElementById("activity-location");
  var queryLabel = document.getElementById("activity-query");
  var status = document.getElementById("activity-status");
  var records = [];
  var shown = 0;
  var pageSize = 4;

  function getContext() {
    try {
      return {
        query: sessionStorage.getItem("communityLocalInfoQuery") || "",
        location: JSON.parse(sessionStorage.getItem("communityLocalInfoLocation") || "null"),
      };
    } catch (_) { return { query: "", location: null }; }
  }
  function getTarget(query) {
    if (/親子|幼兒|育兒|托育|兒童/.test(query)) return "親子";
    if (/長者|長照|銀髮|老人|樂齡/.test(query)) return "長者";
    if (/身障|身心障礙/.test(query)) return "身心障礙者";
    if (/新住民/.test(query)) return "新住民";
    return "";
  }
  function getTime(query) {
    if (/今天|今日/.test(query)) return "today";
    if (/本週|這週|這星期|本星期/.test(query)) return "week";
    if (/本月|這個月/.test(query)) return "month";
    return "";
  }
  function getType(query) {
    var types = ["補助", "長照", "托育", "課程", "活動", "租屋", "就業", "福利"];
    return types.find(function (type) { return query.indexOf(type) >= 0; }) || query || "活動";
  }
  function makeMeta(label, value) {
    if (!value) return null;
    var row = document.createElement("p");
    var key = document.createElement("span");
    row.className = "case-meta";
    key.textContent = label;
    row.append(key, document.createTextNode(value));
    return row;
  }
  function makeCard(record) {
    var card = document.createElement("article");
    var title = document.createElement("h2");
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    var description = document.createElement("p");
    card.className = "case-card";
    title.className = "case-title";
    title.textContent = record.headline || record.title || "福利與活動資訊";
    summary.textContent = "查看資訊摘要";
    description.textContent = [record.snippet, record.conditions && "申請條件：" + record.conditions,
      record.benefits && "服務內容：" + record.benefits].filter(Boolean).join("\n\n") || "請開啟來源頁面查看詳細資訊。";
    details.append(summary, description);
    card.appendChild(title);
    [makeMeta("相關日期", record.eventDate || record.publishedAt), makeMeta("資訊來源", record.source), details]
      .filter(Boolean).forEach(function (element) { card.appendChild(element); });
    if (record.url && /^https:\/\//i.test(record.url)) {
      var link = document.createElement("a");
      link.href = record.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "開啟來源頁面";
      card.appendChild(link);
    }
    return card;
  }
  function showNextPage() {
    var next = Math.min(shown + pageSize, records.length);
    records.slice(shown, next).forEach(function (record) { list.appendChild(makeCard(record)); });
    shown = next;
    countLabel.textContent = "顯示 " + shown + " / " + records.length + " 筆資訊";
    remainingLabel.textContent = String(records.length - shown);
    moreButton.hidden = shown >= records.length;
  }

  var context = getContext();
  if (context.location && context.location.address) locationLabel.textContent = context.location.address;
  if (context.query) {
    queryLabel.textContent = "搜尋：「" + context.query + "」";
    queryLabel.hidden = false;
  }
  moreButton.addEventListener("click", showNextPage);
  status.textContent = "正在搜尋政府與社區資訊…";
  window.CommunityApi.getWelfare({
    region: context.location && context.location.address,
    type: getType(context.query),
    target: getTarget(context.query),
    time: getTime(context.query),
  }).then(function (result) {
    records = result && Array.isArray(result.results) ? result.results : [];
    list.replaceChildren();
    if (!records.length) {
      status.textContent = result && result.answer || "目前找不到符合條件的資訊，請調整條件後再試。";
      countLabel.textContent = "目前沒有查詢結果";
      moreButton.hidden = true;
      return;
    }
    if (result.answer) status.textContent = result.answer;
    if (result.partial) status.textContent += "（部分來源暫時無法取得）";
    showNextPage();
  }).catch(function (error) {
    status.textContent = error.message || "目前無法取得福利與活動資訊，請稍後重試。";
    moreButton.hidden = true;
  });
})();
