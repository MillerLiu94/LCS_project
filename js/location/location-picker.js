(function () {
  "use strict";

  var flow = window.ReportFlow;
  var mode = document.body.getAttribute("data-location-mode") || "recognition";
  var query = document.getElementById("location-query");
  var searchButton = document.getElementById("search-places");
  var currentButton = document.getElementById("use-current-location");
  var results = document.getElementById("place-results");
  var selected = document.getElementById("selected-location");
  var confirm = document.getElementById("confirm-location");
  var status = document.getElementById("status");
  var selectionLabel = document.getElementById("selection-label");
  var mapElement = document.querySelector(".google-map");
  var mapFallback = document.getElementById("map-fallback");
  var mapPreview;
  if (!query || !searchButton || !currentButton || !results || !selected || !confirm || !status) return;
  var pending = false;

  function showStatus(text, error) {
    status.textContent = text;
    status.setAttribute("role", error ? "alert" : "status");
  }

  function coordinateText(location) {
    return Number(location.lat).toFixed(6) + ", " + Number(location.lng).toFixed(6);
  }

  function renderSelected(location) {
    if (!location) {
      selected.textContent = mode === "edit" ? "目前沒有已選位置。" : "請搜尋地點或使用手機目前位置。";
      confirm.disabled = mode !== "edit";
      return;
    }
    selected.textContent = (location.address || coordinateText(location)) + "（" + coordinateText(location) + "）";
    var sourceLabel = location.source === "gps" ? "手機定位" : location.source === "map" ? "地圖微調" : "搜尋結果";
    if (selectionLabel) selectionLabel.textContent = "已選位置・" + sourceLabel;
    if (mapPreview) mapPreview.setLocation(location);
    confirm.disabled = false;
  }

  function saveLocation(lat, lng, fallbackAddress, source) {
    if (pending) {
      if (mapPreview) mapPreview.setLocation(flow.getDraft().location);
      return Promise.resolve();
    }
    pending = true;
    if (mapPreview) mapPreview.setBusy(true);
    searchButton.disabled = true;
    currentButton.disabled = true;
    showStatus("正在確認地址…");
    var latitude = Number(lat);
    var longitude = Number(lng);
    return flow.reverse(latitude, longitude).then(function (result) {
      var location = {
        lat: latitude,
        lng: longitude,
        address: (result && result.address) || fallbackAddress || coordinateText({ lat: latitude, lng: longitude }),
        source: source,
      };
      flow.saveDraft({ location: location });
      renderSelected(location);
      showStatus("位置已更新。");
      return location;
    }).catch(function (error) {
      if (fallbackAddress) {
        var location = { lat: latitude, lng: longitude, address: fallbackAddress, source: source };
        flow.saveDraft({ location: location });
        renderSelected(location);
        showStatus((source === "map" ? "地址反查失敗，已保留所選座標：" : "地址反查暫時失敗，已使用搜尋結果地址：") + error.message, true);
        return location;
      }
      if (mapPreview) mapPreview.setLocation(flow.getDraft().location);
      showStatus(error.message || "地址確認失敗，請重試。", true);
      throw error;
    }).finally(function () {
      pending = false;
      if (mapPreview) mapPreview.setBusy(false);
      searchButton.disabled = false;
      currentButton.disabled = false;
    });
  }

  function renderResults(places) {
    results.replaceChildren();
    if (!places.length) {
      showStatus("沒有找到地點，請換個關鍵字再搜尋。", false);
      return;
    }
    places.forEach(function (place) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "place-result";
      button.setAttribute("role", "option");
      button.setAttribute("aria-label", [place.name, place.address].filter(Boolean).join("，"));
      var name = document.createElement("strong");
      name.textContent = place.name || place.address || "未命名地點";
      var address = document.createElement("span");
      address.textContent = place.address || "";
      button.append(name, address);
      button.addEventListener("click", function () {
        Array.prototype.forEach.call(results.querySelectorAll("button"), function (item) {
          item.disabled = true;
        });
        saveLocation(place.lat, place.lng, place.address || place.name, "search").then(function () {
          results.replaceChildren();
        }).catch(function () {
          Array.prototype.forEach.call(results.querySelectorAll("button"), function (item) {
            item.disabled = false;
          });
        });
      });
      results.appendChild(button);
    });
    showStatus("選擇一個搜尋結果以確認位置。");
  }

  function searchPlaces() {
    var text = query.value.trim();
    if (pending) return;
    if (!text) {
      showStatus("請先輸入地址、地標或社區名稱。", true);
      query.focus();
      return;
    }
    searchButton.disabled = true;
    searchButton.textContent = "搜尋中";
    showStatus("正在搜尋地點…");
    flow.searchPlaces(text).then(function (places) {
      renderResults(Array.isArray(places) ? places : []);
    }).catch(function (error) {
      showStatus(error.message || "地點搜尋失敗，請重試。", true);
    }).finally(function () {
      searchButton.disabled = false;
      searchButton.textContent = "搜尋";
    });
  }

  function useCurrentLocation() {
    if (pending) return;
    if (!navigator.geolocation) {
      showStatus("此瀏覽器不支援手機定位，請改用地點搜尋。", true);
      return;
    }
    currentButton.disabled = true;
    showStatus("正在取得手機位置…");
    navigator.geolocation.getCurrentPosition(function (position) {
      saveLocation(position.coords.latitude, position.coords.longitude, "", "gps").catch(function () {});
    }, function (error) {
      showStatus(error.code === 1 ? "尚未允許定位，請允許瀏覽器存取位置或改用搜尋。" : "無法取得目前位置，請改用搜尋。", true);
      currentButton.disabled = false;
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  function showPhotos(files) {
    var section = document.getElementById("uploaded-photos");
    var list = document.getElementById("uploaded-list");
    if (!section || !list || !files.length) return;
    section.hidden = false;
    document.getElementById("uploaded-count").textContent = files.length + " 張";
    files.forEach(function (file, index) {
      var item = document.createElement("figure");
      item.className = "uploaded-item";
      var image = document.createElement("img");
      image.className = "uploaded-image";
      image.src = URL.createObjectURL(file);
      image.alt = "申報照片 " + (index + 1);
      var caption = document.createElement("figcaption");
      caption.className = "uploaded-name";
      caption.textContent = file.name;
      item.append(image, caption);
      list.appendChild(item);
    });
  }

  var locationSearch = document.getElementById("location-search");
  if (locationSearch) locationSearch.setAttribute("aria-label", "位置搜尋");
  searchButton.addEventListener("click", searchPlaces);
  query.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchPlaces();
    }
  });
  currentButton.addEventListener("click", useCurrentLocation);
  confirm.addEventListener("click", function () {
    if (confirm.disabled || !flow.getDraft().location) return;
    window.location.href = "report-review.html";
  });

  var draft = flow.getDraft();
  if (mode === "edit") renderSelected(draft.location);
  else renderSelected(null);
  if (mapElement && window.GoogleMapsPreview) {
    window.GoogleMapsPreview.create(mapElement, draft.location, function (position) {
      saveLocation(position.lat, position.lng, coordinateText(position), "map").catch(function () {});
    }).then(function (preview) {
      mapPreview = preview;
      mapPreview.setLocation(flow.getDraft().location);
      mapFallback.hidden = true;
    }).catch(function (error) {
      mapFallback.textContent = error.message || "Google 地圖暫時無法載入。";
      showStatus(mapFallback.textContent, true);
    });
  }
  flow.getFiles().then(showPhotos).catch(function () {});
})();
