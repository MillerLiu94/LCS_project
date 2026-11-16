(function (global) {
  "use strict";

  var api = global.CommunityApi;

  function parseError(response) {
    return response.text().then(function (text) {
      var data;
      try { data = JSON.parse(text); } catch (_) { data = null; }
      var error = new Error((data && (data.detail || data.error || data.message)) || text || "AI 服務暫時無法使用。");
      error.status = response.status;
      throw error;
    });
  }

  function makePayload(message, messages, images) {
    var payload = { message: String(message || "").trim(), messages: Array.isArray(messages) ? messages : [] };
    if (!Array.isArray(images) || !images.length) return Promise.resolve(payload);

    var imageUris = images.map(function (image) { return typeof image === "string" ? image : image && image.dataUrl; });
    if (imageUris.some(function (image) { return typeof image !== "string" || !/^data:image\//i.test(image); })) {
      return Promise.reject(new Error("附圖格式不正確，請重新選擇圖片。"));
    }
    return api.analyze(imageUris).then(function (analysis) {
      if (!analysis || analysis.error || !analysis.description) {
        throw new Error((analysis && analysis.error) || "圖片分析沒有完整結果，請重試。");
      }
      var label = analysis.label || analysis.key_name || "未分類";
      var context = "附圖分析結果：" + label + "；" + analysis.description;
      var question = payload.message || "請根據附圖分析結果回答。";
      payload.message = question + "\n\n" + context;
      if (payload.messages.length && payload.messages[payload.messages.length - 1].role === "user") {
        payload.messages[payload.messages.length - 1].content = payload.message;
      } else {
        payload.messages.push({ role: "user", content: payload.message });
      }
      return payload;
    });
  }

  function requestChat(path, payload, signal) {
    return fetch(api.apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
      signal: signal,
      cache: "no-store",
    }).then(function (response) {
      return response.ok ? response.json() : parseError(response);
    });
  }

  function chat(message, messages, signal, images) {
    return makePayload(message, messages, images).then(function (payload) {
      return requestChat("/chat", payload, signal);
    });
  }

  function streamChat(message, messages, signal, images) {
    return makePayload(message, messages, images).then(function (payload) {
      return fetch(api.apiUrl("/chat/stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        credentials: "include",
        body: JSON.stringify(payload),
        signal: signal,
        cache: "no-store",
      }).then(function (response) {
        if (response.status !== 404 && response.status !== 405) return response;
        return requestChat("/chat", payload, signal).then(function (result) {
          return new Response(String(result && result.reply || ""), {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        });
      });
    });
  }

  api.chat = chat;
  api.streamChat = streamChat;
})(window);
