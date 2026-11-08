(function () {
  "use strict";

  var api = window.CommunityApi;
  var questionForm = document.getElementById("local-info-form");
  var question = document.getElementById("local-info-question");
  var editorToggle = document.getElementById("toggle-location-editor");
  var editor = document.getElementById("location-editor");
  var query = document.getElementById("location-query");
  var searchButton = document.getElementById("search-places");
  var voiceButton = document.getElementById("voice-search");
  var currentButton = document.getElementById("use-current-location");
  var results = document.getElementById("place-results");
  var label = document.getElementById("location-label");
  var submitButton = document.getElementById("confirm-location");
  var status = document.getElementById("status");
  var mapElement = document.getElementById("google-map");
  var mapFallback = document.getElementById("map-fallback");
  if (!questionForm || !query || !searchButton || !label || !submitButton) return;

  var mapPreview = null;
  var mapLoading = false;
  var selected = null;
  var busy = false;
  var locating = false;

  function coordinateText(location) {
    return Number(location.lat).toFixed(6) + ", " + Number(location.lng).toFixed(6);
  }
  function showStatus(message, error) {
    status.textContent = message || "";
    status.setAttribute("role", error ? "alert" : "status");
    if (error) status.dataset.error = "true";
    else delete status.dataset.error;
  }
  function renderLocation(location) {
    selected = location || null;
    label.textContent = location ? location.address : "目前地區尚未取得，仍可直接查詢";
    if (mapPreview) mapPreview.setLocation(location);
  }
  function setBusy(value) {
    busy = value;
    searchButton.disabled = value;
    if (currentButton) currentButton.disabled = value || locating;
    if (voiceButton) voiceButton.disabled = value || !window.SpeechRecognition && !window.webkitSpeechRecognition;
    if (mapPreview) mapPreview.setBusy(value);
  }
  function resolveLocation(lat, lng, fallbackAddress, source) {
    if (busy) return Promise.resolve();
    var position = { lat: Number(lat), lng: Number(lng) };
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return Promise.reject(new Error("地點座標格式不正確。"));
    setBusy(true);
    showStatus("正在確認地點…");
    var reverse = api && api.reverse ? api.reverse(position.lat, position.lng) : Promise.resolve(null);
    return Promise.resolve(reverse).then(function (result) {
      position.address = result && result.address || fallbackAddress || coordinateText(position);
      position.source = source;
      renderLocation(position);
      showStatus(position.address === coordinateText(position) ? "地址暫時無法辨識，已保留地圖座標。" : "查詢地點已更新。");
      return position;
    }).catch(function () {
      position.address = fallbackAddress || coordinateText(position);
      position.source = source;
      renderLocation(position);
      showStatus("地址暫時無法辨識，已保留地圖座標。");
      return position;
    }).finally(function () { setBusy(false); });
  }
  function renderResults(places) {
    results.replaceChildren();
    if (!places.length) { showStatus("沒有找到地點，請換個關鍵字再搜尋。", true); return; }
    places.forEach(function (place) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "place-result";
      var name = document.createElement("strong");
      name.textContent = place.name || place.address || "未命名地點";
      var address = document.createElement("span");
      address.textContent = place.address || "";
      button.append(name, address);
      button.addEventListener("click", function () {
        resolveLocation(place.lat, place.lng, place.address || place.name, "search").then(function () { results.replaceChildren(); });
      });
      results.appendChild(button);
    });
    showStatus("選擇一個搜尋結果以更新查詢地點。");
  }
  function searchPlaces() {
    var text = query.value.trim();
    if (busy) return;
    if (!text) { showStatus("請輸入地址、地標或社區名稱。", true); query.focus(); return; }
    if (!api || !api.searchPlaces) { showStatus("地點搜尋服務暫時無法使用。", true); return; }
    searchButton.disabled = true;
    showStatus("正在搜尋地點…");
    api.searchPlaces(text).then(function (places) { renderResults(Array.isArray(places) ? places : []); })
      .catch(function (error) { showStatus(error.message || "地點搜尋失敗，請重試。", true); })
      .finally(function () { searchButton.disabled = false; });
  }
  function useCurrentLocation() {
    if (busy || locating) return;
    if (!navigator.geolocation) { showStatus("瀏覽器不支援定位，仍可直接查詢或搜尋地點。", true); return; }
    locating = true;
    if (currentButton) currentButton.disabled = true;
    showStatus("正在取得目前位置…");
    navigator.geolocation.getCurrentPosition(function (position) {
      locating = false;
      resolveLocation(position.coords.latitude, position.coords.longitude, "", "gps").catch(function () {});
    }, function (error) {
      locating = false;
      if (currentButton) currentButton.disabled = false;
      showStatus(error.code === 1 ? "尚未允許定位，仍可搜尋地點或直接查詢。" : "無法取得目前位置，仍可直接查詢。", true);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 });
  }
  function setupVoiceSearch() {
    var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!voiceButton) return;
    if (!Recognition) { voiceButton.disabled = true; voiceButton.title = "此瀏覽器不支援語音輸入"; return; }
    var recognition = new Recognition();
    recognition.lang = "zh-TW";
    recognition.interimResults = false;
    recognition.onstart = function () { voiceButton.setAttribute("aria-pressed", "true"); showStatus("請說出地址、地標或社區名稱。"); };
    recognition.onresult = function (event) { query.value = event.results[0][0].transcript; searchPlaces(); };
    recognition.onerror = function () { showStatus("語音辨識未完成，您也可以直接輸入地點。", true); };
    recognition.onend = function () { voiceButton.setAttribute("aria-pressed", "false"); };
    voiceButton.addEventListener("click", function () { try { recognition.start(); } catch (_) { recognition.stop(); } });
  }
  function ensureMap() {
    if (!mapElement || mapPreview || mapLoading) return;
    if (!window.GoogleMapsPreview) { mapFallback.textContent = "Google 地圖功能暫時無法使用，仍可搜尋地點。"; return; }
    mapLoading = true;
    mapFallback.hidden = false;
    mapFallback.textContent = "正在載入 Google 地圖…";
    window.requestAnimationFrame(function () {
      if (editor.hidden) { mapLoading = false; return; }
      window.GoogleMapsPreview.create(mapElement, selected, function (position) {
        resolveLocation(position.lat, position.lng, coordinateText(position), "map").catch(function () {});
      }).then(function (preview) {
        mapPreview = preview;
        mapPreview.setLocation(selected);
        mapFallback.hidden = true;
      }).catch(function (error) {
        mapFallback.textContent = error.message || "Google 地圖暫時無法載入，請使用搜尋或定位。";
      }).finally(function () { mapLoading = false; });
    });
  }
  editorToggle.addEventListener("click", function () {
    var open = editor.hidden;
    editor.hidden = !open;
    editorToggle.setAttribute("aria-expanded", String(open));
    editorToggle.textContent = open ? "收合地點" : "更改地點";
    if (open) {
      ensureMap();
      query.focus();
    }
  });
  searchButton.addEventListener("click", searchPlaces);
  if (currentButton) currentButton.addEventListener("click", useCurrentLocation);
  if (question) question.addEventListener("input", function () {
    question.style.height = "auto";
    question.style.height = Math.min(question.scrollHeight, 220) + "px";
  });
  query.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); searchPlaces(); } });
  questionForm.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      var message = question.value.trim();
      if (selected) sessionStorage.setItem("communityLocalInfoLocation", JSON.stringify(selected));
      else sessionStorage.removeItem("communityLocalInfoLocation");
      sessionStorage.setItem("communityLocalInfoQuery", message);
      sessionStorage.removeItem("communityChatFirstPrompt");
      window.location.href = "activities-loading.html";
    } catch (_) { showStatus("目前無法開始查詢，請重新整理後再試。", true); }
  });
  setupVoiceSearch();
  document.querySelectorAll("[data-nudge]").forEach(function (button) { button.disabled = true; });
  window.setTimeout(function () {
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem("communityCurrentLocation") || "null"); } catch (_) {}
    if (cached && Number.isFinite(Number(cached.lat)) && Number.isFinite(Number(cached.lng))) {
      resolveLocation(cached.lat, cached.lng, "", "gps").catch(function () {});
    } else useCurrentLocation();
  }, 0);
})();
