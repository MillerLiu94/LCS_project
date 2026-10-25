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

  function eventText(block) {
    var lines = block.split(/\r?\n/);
    var data = [];
    var ended = false;
    lines.forEach(function (line) {
      if (line.indexOf("data:") === 0) data.push(line.slice(5).replace(/^ /, ""));
      if (line === "event: done" || line === "event: end") ended = true;
    });
    var raw = data.join("\n");
    if (raw === "[DONE]") ended = true;
    return { text: textFrom(raw), ended: ended };
  }

  function consume(response, onText) {
    if (!response.body || !response.body.getReader) {
      return response.text().then(function (text) { if (text) onText(text); });
    }
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";
    var isSse = (response.headers.get("content-type") || "").indexOf("text/event-stream") >= 0;
    function read() {
      return reader.read().then(function (result) {
        if (result.done) {
          buffer += decoder.decode();
          if (buffer.trim()) {
            if (isSse) onText(eventText(buffer).text);
            else onText(buffer);
          }
          return;
        }
        var chunk = decoder.decode(result.value, { stream: true });
        if (!isSse) onText(chunk);
        else {
          buffer += chunk;
          var boundary = /\r?\n\r?\n/;
          var match;
          while ((match = boundary.exec(buffer))) {
            var event = eventText(buffer.slice(0, match.index));
            if (event.text) onText(event.text);
            buffer = buffer.slice(match.index + match[0].length);
          }
        }
        return read();
      });
    }
    return read();
  }

  global.ChatStream = { consume: consume };
})(window);
