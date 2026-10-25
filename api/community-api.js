(function (global) {
  "use strict";

  var config = global.CommunityConfig || {};

  function apiUrl(path) {
    var base = String(config.apiBaseUrl || "/api").replace(/\/+$/, "");
    if (!/\/api$/i.test(base)) base += "/api";
    return base + (path.charAt(0) === "/" ? path : "/" + path);
  }

  function responseError(response) {
    return response.text().then(function (text) {
      var data;
      try { data = JSON.parse(text); } catch (_) { data = null; }
      throw new Error((data && (data.detail || data.error)) || text || "後端服務暫時無法使用。");
    });
  }

  function getJson(path) {
    return fetch(apiUrl(path), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    }).then(function (response) {
      if (!response.ok) return responseError(response);
      return response.json();
    });
  }

  function postJson(path, body) {
    return fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }).then(function (response) {
      if (!response.ok) return responseError(response);
      return response.json();
    });
  }

  function streamChat(message, messages, signal) {
    return fetch(apiUrl("/chat/stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ message: message, messages: messages }),
      signal: signal,
      cache: "no-store",
    });
  }

  function uploadFiles(files, onProgress) {
    return new Promise(function (resolve, reject) {
      var form = new FormData();
      files.forEach(function (file) { form.append("files", file, file.name); });
      var request = new XMLHttpRequest();
      request.open("POST", apiUrl("/uploads"));
      request.responseType = "json";
      request.upload.onprogress = function (event) {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round(event.loaded / event.total * 100));
        }
      };
      request.onload = function () {
        if (request.status >= 200 && request.status < 300 && request.response) resolve(request.response);
        else reject(new Error((request.response && (request.response.detail || request.response.error)) || "照片上傳失敗，請重試。"));
      };
      request.onerror = function () { reject(new Error("無法連線到照片上傳服務。")); };
      request.ontimeout = function () { reject(new Error("照片上傳逾時，請重試。")); };
      request.timeout = 120000;
      request.send(form);
    });
  }

  global.CommunityApi = {
    apiUrl: apiUrl,
    getWeather: function (lat, lng) {
      return getJson("/weather?lat=" + encodeURIComponent(lat) + "&lng=" + encodeURIComponent(lng));
    },
    analyze: function (images) { return postJson("/ai-analyze", { images: images }); },
    upload: uploadFiles,
    searchPlaces: function (query) { return getJson("/places?q=" + encodeURIComponent(query)); },
    reverse: function (lat, lng) {
      return getJson("/places/reverse?lat=" + encodeURIComponent(lat) + "&lng=" + encodeURIComponent(lng));
    },
    createCase: function (payload) { return postJson("/cases", payload); },
    streamChat: streamChat,
    authorAccount: String(config.mockAuthorAccount || "test1"),
  };
})(window);
