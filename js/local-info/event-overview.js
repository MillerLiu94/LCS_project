(function () {
  "use strict";

  var events = [
    { title: "里民健康講座", date: "11/14（六）14:00", iso: "2026-11-14T14:00", place: "XX里民活動中心", host: "XX里辦公處", detail: "邀請社區護理師分享日常保健與健康管理，歡迎里民免費參加。" },
    { title: "親子手作小時光", date: "11/15（日）10:00", iso: "2026-11-15T10:00", place: "XX里民活動中心二樓", host: "XX社區發展協會", detail: "親子一起製作季節手作，材料由主辦單位準備，名額有限。" },
    { title: "樂齡手機教學", date: "11/18（三）09:30", iso: "2026-11-18T09:30", place: "XX里辦公處教室", host: "XX里辦公處", detail: "志工帶領長者練習手機常用功能，請攜帶自己的手機。" },
    { title: "社區健康促進活動", date: "11/21（六）09:00", iso: "2026-11-21T09:00", place: "XX里民活動中心前廣場", host: "XX衛生所", detail: "提供簡易健康諮詢與量測，現場依報到順序參加。" },
    { title: "鄰里二手小市集", date: "11/22（日）13:00", iso: "2026-11-22T13:00", place: "XX鄰里公園", host: "XX社區發展協會", detail: "分享閒置好物與生活用品，活動資訊請洽主辦單位。" },
    { title: "銀髮伸展運動課", date: "11/25（三）08:30", iso: "2026-11-25T08:30", place: "XX里民活動中心", host: "XX樂齡學習中心", detail: "由帶領老師陪伴進行簡單伸展，建議穿著輕便服裝。" },
    { title: "社區親子共讀", date: "11/28（六）10:30", iso: "2026-11-28T10:30", place: "XX圖書閱覽室", host: "XX里辦公處", detail: "透過繪本共讀與分享活動，陪孩子享受閱讀時光。" },
    { title: "冬日關懷音樂會", date: "11/29（日）15:00", iso: "2026-11-29T15:00", place: "XX里民活動中心大禮堂", host: "XX社區發展協會", detail: "由社區團隊帶來音樂演出，活動免費入場。" },
    { title: "銀髮營養分享會", date: "12/02（三）10:00", iso: "2026-12-02T10:00", place: "XX里辦公處教室", host: "XX衛生所", detail: "營養師分享日常飲食搭配與簡單備餐方法。" },
    { title: "社區歲末同樂會", date: "12/05（六）14:00", iso: "2026-12-05T14:00", place: "XX里民活動中心", host: "XX里辦公處", detail: "邀請居民一起參加歲末交流活動，現場備有茶點。" }
  ];
  var list = document.getElementById("events-list");
  var count = document.getElementById("event-count");
  var status = document.getElementById("event-status");
  var retry = document.getElementById("retry-events");
  var pageSize = 10;
  var loaded = events.length;
  var loading = false;
  var finished = false;
  var observer;

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

  function makeCard(event) {
    var card = document.createElement("article");
    var title = document.createElement("h2");
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    var description = document.createElement("p");
    card.className = "case-card";
    title.className = "case-title";
    title.textContent = event.title;
    details.className = "case-details";
    summary.textContent = "活動詳情";
    description.textContent = event.detail || "請洽主辦單位了解活動內容。";
    details.append(summary, description);
    card.append(title, makeMeta("活動時間", event.date || "時間未提供", event.iso));
    card.append(makeMeta("活動地點", event.place || "地點未提供"));
    card.append(makeMeta("主辦單位", event.host || "社區單位"), details);
    return card;
  }

  function extractEvents(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.events)) return result.events;
    if (result && Array.isArray(result.items)) return result.items;
    return [];
  }

  function normalizeEvent(event) {
    return {
      title: event.title || event.name || "社區活動",
      date: event.date || event.dateLabel || event.startTime || "",
      iso: event.iso || event.startTime || "",
      place: event.place || event.location || event.address || "",
      host: event.host || event.organizer || "",
      detail: event.detail || event.description || ""
    };
  }

  function watchNextBatch() {
    if (observer) observer.disconnect();
    if (finished || !window.IntersectionObserver) {
      if (!finished) retry.hidden = false;
      return;
    }
    var triggerIndex = Math.min(list.children.length - 1, loaded - pageSize + 6);
    var trigger = list.children[triggerIndex];
    if (trigger) observer.observe(trigger);
  }

  function loadNextBatch() {
    if (loading || finished) return;
    loading = true;
    if (observer) observer.disconnect();
    retry.hidden = true;
    retry.textContent = "載入更多活動";
    status.textContent = "正在載入更多活動…";
    window.CommunityApi.getEvents(loaded, pageSize).then(function (result) {
      var batch = extractEvents(result);
      if (!batch.length) {
        finished = true;
        if (observer) observer.disconnect();
        status.textContent = "目前已顯示所有活動。";
        return;
      }
      batch.map(normalizeEvent).forEach(function (event) { list.appendChild(makeCard(event)); });
      loaded += batch.length;
      count.textContent = "目前顯示 " + loaded + " 筆活動";
      finished = result && typeof result.hasMore === "boolean" ? !result.hasMore : batch.length < pageSize;
      status.textContent = finished ? "目前已顯示所有活動。" : "";
      if (!finished) watchNextBatch();
    }).catch(function () {
      status.textContent = "暫時無法載入更多活動，請稍後重試。";
      retry.textContent = "重新載入活動";
      retry.hidden = false;
    }).finally(function () {
      loading = false;
    });
  }

  events.forEach(function (event) { list.appendChild(makeCard(event)); });
  if (window.IntersectionObserver) {
    observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) loadNextBatch();
    }, { rootMargin: "0px", threshold: 0.8 });
    watchNextBatch();
  } else retry.hidden = false;
  retry.addEventListener("click", loadNextBatch);
})();
