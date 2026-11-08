(function () {
  "use strict";

  var cases = [
    { category: "道路坑洞", title: "中正路路面出現坑洞", reportedAt: "11/08（日）09:42", iso: "2026-11-08T09:42", place: "XX里中正路 88 號附近", status: "處理中", detail: "居民回報路面有坑洞，影響行人與車輛通行。" },
    { category: "路燈故障", title: "活動中心旁路燈未亮", reportedAt: "11/08（日）08:15", iso: "2026-11-08T08:15", place: "XX里民活動中心旁", status: "已受理", detail: "居民回報夜間照明設備未正常亮起，請相關單位協助檢修。" },
    { category: "垃圾堆置", title: "巷口發現大型垃圾堆置", reportedAt: "11/07（六）19:06", iso: "2026-11-07T19:06", place: "XX里民生街 12 巷口", status: "待處理", detail: "居民反映巷口有大型廢棄物堆置，請協助確認清運。" },
    { category: "人行道破損", title: "人行道地磚隆起", reportedAt: "11/07（六）15:20", iso: "2026-11-07T15:20", place: "XX里國小東側人行道", status: "處理中", detail: "居民回報人行道地磚隆起，行經時可能有絆倒風險。" },
    { category: "排水積水", title: "雨水孔周邊積水未退", reportedAt: "11/06（五）17:34", iso: "2026-11-06T17:34", place: "XX里和平路與巷口交叉處", status: "已受理", detail: "居民反映雨水孔附近持續積水，請協助檢查排水狀況。" },
    { category: "交通安全", title: "巷口反光鏡角度偏移", reportedAt: "11/06（五）10:08", iso: "2026-11-06T10:08", place: "XX里信義街 5 巷口", status: "待處理", detail: "居民反映巷口反光鏡角度偏移，可能影響轉彎視線。" },
    { category: "公共設施", title: "公園座椅木板鬆脫", reportedAt: "11/05（四）16:52", iso: "2026-11-05T16:52", place: "XX里鄰里公園涼亭旁", status: "處理中", detail: "居民回報公園座椅木板鬆脫，請協助檢查並修繕。" },
    { category: "環境衛生", title: "回收區周邊散落垃圾", reportedAt: "11/04（三）12:16", iso: "2026-11-04T12:16", place: "XX里活動中心後方回收區", status: "已受理", detail: "居民反映回收區周圍有垃圾散落，請協助整理環境。" }
  ];
  var list = document.getElementById("cases-list");
  var moreButton = document.getElementById("show-more");
  var countLabel = document.getElementById("case-count");
  var shown = 0;
  var pageSize = 4;

  function makeMeta(label, value, iso) {
    var row = document.createElement("p");
    var key = document.createElement("span");
    key.textContent = label;
    row.className = "case-meta";
    row.appendChild(key);
    if (iso) {
      var time = document.createElement("time");
      time.dateTime = iso;
      time.textContent = value;
      row.appendChild(time);
    } else row.appendChild(document.createTextNode(value));
    return row;
  }

  function makeCard(caseInfo) {
    var card = document.createElement("article");
    var top = document.createElement("div");
    var tag = document.createElement("span");
    var status = document.createElement("span");
    var title = document.createElement("h2");
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    var description = document.createElement("p");
    card.className = "case-card";
    top.className = "case-card__top";
    tag.className = "case-category";
    tag.textContent = caseInfo.category;
    status.className = "case-status";
    status.textContent = caseInfo.status;
    title.className = "case-title";
    title.textContent = caseInfo.title;
    details.className = "case-details";
    summary.textContent = "案件詳情";
    description.textContent = caseInfo.detail;
    top.append(tag, status);
    details.append(summary, description);
    card.append(top, title, makeMeta("申報時間", caseInfo.reportedAt, caseInfo.iso), makeMeta("發生地點", caseInfo.place), details);
    return card;
  }

  function showNextPage() {
    var next = Math.min(shown + pageSize, cases.length);
    cases.slice(shown, next).forEach(function (caseInfo) { list.appendChild(makeCard(caseInfo)); });
    shown = next;
    countLabel.textContent = "顯示 " + shown + " 件案件";
    moreButton.hidden = shown >= cases.length;
  }

  moreButton.addEventListener("click", showNextPage);
  showNextPage();
})();
