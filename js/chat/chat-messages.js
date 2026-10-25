(function (global) {
  "use strict";

  function createUser(list, text) {
    var row = document.createElement("article");
    row.className = "message message--user";
    row.setAttribute("aria-label", "你的訊息");
    var bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    list.appendChild(row);
  }
  function createAssistant(list, existing) {
    if (existing) {
      existing.row.classList.add("message--streaming");
      existing.text.textContent = "";
      existing.error.remove();
      existing.error = document.createElement("div");
      existing.indicator.hidden = false;
      return existing;
    }
    var row = document.createElement("article");
    row.className = "message message--assistant message--streaming";
    row.setAttribute("aria-label", "AI 生活助理回覆");
    var avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "AI";
    var content = document.createElement("div");
    content.className = "message-content";
    var label = document.createElement("span");
    label.className = "message-label";
    label.textContent = "AI 生活助理";
    var bubble = document.createElement("div");
    bubble.className = "message-bubble";
    var indicator = document.createElement("span");
    indicator.className = "thinking-indicator";
    indicator.setAttribute("aria-hidden", "true");
    indicator.innerHTML = "<span></span><span></span><span></span>";
    var text = document.createElement("span");
    text.className = "message-text";
    bubble.append(indicator, text);
    content.append(label, bubble);
    row.append(avatar, content);
    list.appendChild(row);
    return { row: row, text: text, indicator: indicator, error: document.createElement("div"), content: content };
  }
  function hasReportIntent(text) {
    var value = String(text || "");
    var terms = "(?:申報|通報|回報|報案|陳情|檢舉|報修|反映)";
    if (!new RegExp(terms).test(value)) return false;
    if (new RegExp("(?:不想|不要|不用|不必|不需要|無需|取消).{0,6}" + terms).test(value)) return false;
    return new RegExp("(?:要|想|需要|希望|打算|準備|幫我|幫忙|協助|請|怎麼|如何|開始|進行|可以).{0,12}" + terms + "|" + terms + ".{0,10}(?:流程|怎麼|如何|開始)").test(value);
  }
  function addReportAction(assistant) {
    if (assistant.reportAction) return;
    var link = document.createElement("a");
    link.className = "report-action-link";
    link.href = "../report/report.html";
    var copy = document.createElement("span");
    copy.className = "report-action-copy";
    var title = document.createElement("strong");
    title.textContent = "需要申報社區事件嗎？";
    var note = document.createElement("span");
    note.textContent = "選擇現場照片，開始建立申報案件。";
    copy.append(title, note);
    var action = document.createElement("span");
    action.className = "report-action-label";
    action.textContent = "開始申報 →";
    link.append(copy, action);
    assistant.content.appendChild(link);
    assistant.reportAction = link;
  }
  global.ChatMessages = {
    createUser: createUser,
    createAssistant: createAssistant,
    hasReportIntent: hasReportIntent,
    addReportAction: addReportAction
  };
})(window);
