(function (global) {
  "use strict";

  function textFrom(value) {
    if (typeof value === "string") {
      if (value === "[DONE]") return "";
      try { return textFrom(JSON.parse(value)); } catch (_) { return value; }
    }
    if (!value || typeof value !== "object") return "";
    var choices = value.choices;
    if (choices && choices[0] && choices[0].delta) return textFrom(choices[0].delta);
    var fields = ["delta", "content", "text", "token", "answer", "output_text"];
    for (var i = 0; i < fields.length; i += 1) {
      if (typeof value[fields[i]] === "string") return value[fields[i]];
    }
    return "";
  }

  function isProgressText(value) {
    return /^正在(?:思考|查資料庫|搜尋外部資料|整理回覆)(?:…|\.{3})?$/.test(String(value || "").trim());
  }

  var progressPattern = /正在(?:思考|查資料庫|搜尋外部資料|整理回覆)(?:…|\.{3})/g;
  var progressVariants = [
    "正在思考", "正在思考…", "正在思考...",
    "正在查資料庫", "正在查資料庫…", "正在查資料庫...",
    "正在搜尋外部資料", "正在搜尋外部資料…", "正在搜尋外部資料...",
    "正在整理回覆", "正在整理回覆…", "正在整理回覆...",
  ];

  function progressPrefixAtEnd(value) {
    var longest = 0;
    progressVariants.forEach(function (variant) {
      var limit = Math.min(value.length, variant.length - 1);
      for (var size = limit; size > longest; size -= 1) {
        if (value.slice(-size) === variant.slice(0, size)) {
          longest = size;
          break;
        }
      }
    });
    return longest;
  }

  function looksLikeSse(value) {
    return /^\uFEFF?\s*(?:event|data):/m.test(value);
  }

  function eventText(block) {
    var lines = block.split(/\r?\n/);
    var data = [];
    var name = "message";
    lines.forEach(function (line) {
      if (line.indexOf("data:") === 0) data.push(line.slice(5).replace(/^ /, ""));
      if (line.indexOf("event:") === 0) name = line.slice(6).trim() || "message";
    });
    var raw = data.join("\n");
    var payload = null;
    try { payload = JSON.parse(raw); } catch (_) { payload = raw; }
    var text = name === "delta" || name === "message" ? textFrom(raw) : "";
    return {
      name: name,
      payload: payload,
      text: text,
    };
  }

  function consume(response, onText, onControl) {
    var pendingText = "";
    function emitText(value, flush) {
      var text = pendingText + String(value || "");
      pendingText = "";
      text = text.replace(progressPattern, "");
      if (isProgressText(text.trim())) text = "";
      if (!flush) {
        var keep = progressPrefixAtEnd(text);
        if (keep) {
          pendingText = text.slice(-keep);
          text = text.slice(0, -keep);
        }
      }
      if (text) onText(text);
    }
    if (!response.body || !response.body.getReader) {
      return response.text().then(function (text) {
        if ((response.headers.get("content-type") || "").indexOf("text/event-stream") >= 0 || looksLikeSse(text)) {
          text.split(/\r?\n\r?\n/).forEach(function (block) { if (block.trim()) dispatch(block); });
        } else {
          emitText(text, true);
        }
        emitText("", true);
      });
    }
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";
    var typeIsSse = (response.headers.get("content-type") || "").indexOf("text/event-stream") >= 0;
    var mode = typeIsSse ? "sse" : "detect";
    function dispatch(block) {
      var event = eventText(block);
      if (event.name === "status" || event.name === "end") return;
      if (event.name === "error") {
        throw new Error((event.payload && event.payload.message) || "AI 回覆失敗，請稍後再試。");
      }
      if (event.name === "done" || event.name === "reset") {
        if (event.name === "reset") pendingText = "";
        if (onControl) onControl(event.name, event.payload);
        return;
      }
      if (event.text) emitText(event.text, false);
    }
    function readSseBlocks() {
      var boundary = /\r?\n\r?\n/;
      var match;
      while ((match = boundary.exec(buffer))) {
        dispatch(buffer.slice(0, match.index));
        buffer = buffer.slice(match.index + match[0].length);
      }
    }
    function read() {
      return reader.read().then(function (result) {
        if (result.done) {
          buffer += decoder.decode();
          if (mode === "detect") mode = looksLikeSse(buffer) ? "sse" : "text";
          if (mode === "sse") {
            readSseBlocks();
            if (buffer.trim()) dispatch(buffer);
          } else {
            emitText(buffer, true);
          }
          emitText("", true);
          return;
        }
        var chunk = decoder.decode(result.value, { stream: true });
        if (mode === "text") {
          emitText(chunk, false);
        } else {
          buffer += chunk;
          if (mode === "detect") {
            var start = buffer.replace(/^\uFEFF/, "").trimStart();
            if (start && looksLikeSse(start)) mode = "sse";
            else if (start && !"event:".startsWith(start) && !"data:".startsWith(start)) {
              mode = "text";
              emitText(buffer, false);
              buffer = "";
            }
          }
          if (mode === "sse") readSseBlocks();
        }
        return read();
      });
    }
    return read();
  }

  global.ChatStream = { consume: consume };
})(window);
