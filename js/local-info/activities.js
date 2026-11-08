(function () {
  "use strict";

  var activities = [
    { title: "里民健康講座", date: "11/14（六）14:00", iso: "2026-11-14T14:00", place: "XX里民活動中心", host: "XX里辦公處", detail: "邀請社區護理師分享日常保健與健康管理，歡迎里民免費參加。" },
    { title: "親子手作小時光", date: "11/15（日）10:00", iso: "2026-11-15T10:00", place: "XX里民活動中心二樓", host: "XX社區發展協會", detail: "親子一起製作季節手作，材料由主辦單位準備，名額有限。" },
    { title: "樂齡手機教學", date: "11/18（三）09:30", iso: "2026-11-18T09:30", place: "XX里辦公處教室", host: "XX里辦公處", detail: "志工帶領長者練習手機常用功能，請攜帶自己的手機。" },
    { title: "社區健康促進活動", date: "11/21（六）09:00", iso: "2026-11-21T09:00", place: "XX里民活動中心前廣場", host: "XX衛生所", detail: "提供簡易健康諮詢與量測，現場依報到順序參加。" },
    { title: "鄰里二手小市集", date: "11/22（日）13:00", iso: "2026-11-22T13:00", place: "XX鄰里公園", host: "XX社區發展協會", detail: "分享閒置好物與生活用品，活動資訊請洽主辦單位。" },
    { title: "銀髮伸展運動課", date: "11/25（三）08:30", iso: "2026-11-25T08:30", place: "XX里民活動中心", host: "XX樂齡學習中心", detail: "由帶領老師陪伴進行簡單伸展，建議穿著輕便服裝。" },
    { title: "社區親子共讀", date: "11/28（六）10:30", iso: "2026-11-28T10:30", place: "XX圖書閱覽室", host: "XX里辦公處", detail: "透過繪本共讀與分享活動，陪孩子享受閱讀時光。" },
    { title: "冬日關懷音樂會", date: "11/29（日）15:00", iso: "2026-11-29T15:00", place: "XX里民活動中心大禮堂", host: "XX社區發展協會", detail: "由社區團隊帶來音樂演出，活動免費入場。" }
  ];
  var list = document.getElementById("activities-list");
  var moreButton = document.getElementById("show-more");
  var countLabel = document.getElementById("activity-count");
  var remainingLabel = document.getElementById("remaining-count");
  var shown = 0;
  var pageSize = 4;

  function getSearchContext() {
    try {
      return {
        query: sessionStorage.getItem("communityLocalInfoQuery") || "",
        location: JSON.parse(sessionStorage.getItem("communityLocalInfoLocation") || "null")
      };
    } catch (_) { return { query: "", location: null }; }
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
  function makeCard(activity) {
    var card = document.createElement("article");
    var title = document.createElement("h2");
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    var description = document.createElement("p");
    card.className = "case-card";
    title.className = "case-title";
    title.textContent = activity.title;
    details.className = "case-details";
    summary.textContent = "活動詳情";
    description.textContent = activity.detail;
    details.append(summary, description);
    card.append(title, makeMeta("活動時間", activity.date, activity.iso));
    card.append(makeMeta("活動地點", activity.place), makeMeta("主辦單位", activity.host), details);
    return card;
  }
  function showNextPage() {
    var next = Math.min(shown + pageSize, activities.length);
    activities.slice(shown, next).forEach(function (activity) { list.appendChild(makeCard(activity)); });
    shown = next;
    countLabel.textContent = "顯示 " + shown + " / " + activities.length + " 筆活動";
    remainingLabel.textContent = String(activities.length - shown);
    moreButton.hidden = shown >= activities.length;
  }

  var context = getSearchContext();
  if (context.location && context.location.address) document.getElementById("activity-location").textContent = context.location.address;
  if (context.query) {
    var queryLabel = document.getElementById("activity-query");
    queryLabel.textContent = "搜尋：「" + context.query + "」";
    queryLabel.hidden = false;
  }
  moreButton.addEventListener("click", showNextPage);
  showNextPage();
})();
