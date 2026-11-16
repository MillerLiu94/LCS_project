(function (global) {
  "use strict";

  var config = global.CommunityConfig || {};
  var scriptUrl = document.currentScript ? document.currentScript.src : location.href;
  var appRoot = new URL("../", scriptUrl);

  function apiUrl(path) {
    var base = String(config.apiBaseUrl || "/api").replace(/\/+$/, "");
    if (!/\/api$/i.test(base)) base += "/api";
    return base + (path.charAt(0) === "/" ? path : "/" + path);
  }

  function queryString(values) {
    var params = new URLSearchParams();
    Object.keys(values || {}).forEach(function (key) {
      var value = values[key];
      if (value !== undefined && value !== null && String(value).trim()) params.set(key, value);
    });
    var query = params.toString();
    return query ? "?" + query : "";
  }

  function responseError(response) {
    return response.text().then(function (text) {
      var data;
      try { data = JSON.parse(text); } catch (_) { data = null; }
      var error = new Error((data && (data.detail || data.error || data.message)) || text || "後端服務暫時無法使用。");
      error.status = response.status;
      throw error;
    });
  }

  function redirectToLogin() {
    var loginUrl = new URL("pages/login/login.html", appRoot);
    if (location.pathname === loginUrl.pathname) return;
    try { sessionStorage.setItem("communityAuthReturnTo", location.pathname + location.search + location.hash); } catch (_) {}
    global.location.assign(loginUrl.href);
  }

  function protectedRequest(promise) {
    return promise.catch(function (error) {
      if (error.status === 401) redirectToLogin();
      throw error;
    });
  }

  function getJson(path) {
    return fetch(apiUrl(path), {
      headers: { Accept: "application/json" },
      credentials: "include",
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
      credentials: "include",
      body: JSON.stringify(body),
    }).then(function (response) {
      if (!response.ok) return responseError(response);
      return response.json();
    });
  }

  function getLineLoginUrl(role) {
    var path = String(config.lineLoginPath || "").trim();
    if (!path) throw new Error("LINE_LOGIN_PATH 尚未設定。");
    if (role !== "resident" && role !== "staff") throw new Error("請選擇有效的登入身分。");
    return apiUrl(path) + "?role=" + encodeURIComponent(role);
  }

  function uploadFiles(files, onProgress) {
    return protectedRequest(new Promise(function (resolve, reject) {
      var form = new FormData();
      files.forEach(function (file) { form.append("files", file, file.name); });
      var request = new XMLHttpRequest();
      request.open("POST", apiUrl("/uploads"));
      request.withCredentials = true;
      request.responseType = "json";
      request.upload.onprogress = function (event) {
        if (event.lengthComputable && onProgress) onProgress(Math.round(event.loaded / event.total * 100));
      };
      request.onload = function () {
        if (request.status >= 200 && request.status < 300 && request.response) resolve(request.response);
        else {
          var error = new Error((request.response && (request.response.detail || request.response.error)) || "照片上傳失敗，請重試。");
          error.status = request.status;
          reject(error);
        }
      };
      request.onerror = function () { reject(new Error("無法連線到照片上傳服務。")); };
      request.ontimeout = function () { reject(new Error("照片上傳逾時，請重試。")); };
      request.timeout = 120000;
      request.send(form);
    }));
  }

  function transcribe(blob, language, filename) {
    if (!blob || !blob.size) return Promise.reject(new Error("錄音內容是空的，請重新錄製。"));
    if (blob.size > 20 * 1024 * 1024) return Promise.reject(new Error("錄音檔超過 20 MB，請縮短錄音。"));
    var form = new FormData();
    form.append("file", blob, filename || "recording.webm");
    form.append("language", language || "zh");
    return fetch(apiUrl("/transcribe"), { method: "POST", credentials: "include", body: form })
      .then(function (response) { return response.ok ? response.json() : responseError(response); });
  }

  function assetUrl(path) {
    var value = String(path || "").trim();
    if (!value || /^(?:https?:|data:|blob:)/i.test(value)) return value;
    return value.charAt(0) === "/" ? value : "/" + value;
  }

  global.CommunityApi = {
    apiUrl: apiUrl,
    redirectToLogin: redirectToLogin,
    assetUrl: assetUrl,
    getWeather: function (lat, lng) {
      return getJson("/weather" + queryString({ lat: lat, lng: lng }));
    },
    getCategories: function () { return getJson("/categories"); },
    analyze: function (images) { return postJson("/ai-analyze", { images: images }); },
    upload: uploadFiles,
    transcribe: transcribe,
    searchPlaces: function (query) { return getJson("/places" + queryString({ q: query })); },
    reverse: function (lat, lng) {
      return getJson("/places/reverse" + queryString({ lat: lat, lng: lng }));
    },
    createCase: function (payload) { return protectedRequest(postJson("/cases", payload)); },
    getCurrentUser: function () { return getJson("/auth/me"); },
    logout: function () { return postJson("/auth/logout", {}); },
    getEvents: function (offset, limit, filters) {
      return getJson("/events" + queryString(Object.assign({ offset: offset, limit: limit }, filters || {})));
    },
    getEvent: function (eventId) { return getJson("/events/" + encodeURIComponent(eventId)); },
    getMyCases: function (offset, limit) {
      return protectedRequest(getJson("/cases" + queryString({ offset: offset, limit: limit })));
    },
    getWelfare: function (filters) { return getJson("/welfare" + queryString(filters)); },
    getLineLoginUrl: getLineLoginUrl,
  };
})(window);
