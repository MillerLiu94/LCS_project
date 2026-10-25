(function (global) {
  "use strict";

  var locationName = document.querySelector("[data-location-name]");
  var weatherStatus = document.querySelector("[data-weather-status]");
  var locationContainer = document.querySelector("[data-location-container]");
  var refreshButton = document.querySelector("[data-location-refresh]");
  var pending = false;
  if (!locationName || !weatherStatus || !refreshButton) return;

  function setBusy(busy) {
    pending = busy;
    refreshButton.disabled = busy;
    if (locationContainer) locationContainer.setAttribute("aria-busy", String(busy));
  }

  function regionLabel(address) {
    var match = String(address || "").match(/(臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)([^區鄉鎮市]{1,6}(?:區|鄉|鎮|市))/);
    return match ? match[1].replace(/臺/g, "台") + "・" + match[2] : "";
  }

  function updateRegion(lat, lng) {
    if (!global.CommunityApi || typeof global.CommunityApi.reverse !== "function") {
      locationName.textContent = "縣市與地區暫時無法取得";
      return Promise.resolve();
    }
    return global.CommunityApi.reverse(lat, lng).then(function (result) {
      locationName.textContent = regionLabel(result && result.address) || "縣市與地區暫時無法判讀";
    }).catch(function () {
      locationName.textContent = "縣市與地區暫時無法取得";
    });
  }

  function updateWeather(lat, lng) {
    if (!global.CommunityApi || typeof global.CommunityApi.getWeather !== "function") {
      weatherStatus.textContent = "天氣暫時無法取得";
      return Promise.resolve();
    }
    return global.CommunityApi.getWeather(lat, lng).then(function (weather) {
      var temperature = Number(weather && weather.temperatureC);
      var condition = String(weather && weather.condition || "").trim();
      if (!condition || !Number.isFinite(temperature)) throw new Error("Invalid weather response");
      weatherStatus.textContent = condition + "・" + Math.round(temperature) + "°C";
    }).catch(function () {
      weatherStatus.textContent = "天氣暫時無法取得";
    });
  }

  function showLocationError(error) {
    locationName.textContent = error && error.code === 1 ? "請允許定位以更新地區" : "無法取得目前位置";
    weatherStatus.textContent = "位置未取得";
    setBusy(false);
  }

  function requestLocation() {
    if (pending) return;
    if (!global.navigator.geolocation) {
      showLocationError();
      return;
    }
    setBusy(true);
    locationName.textContent = "正在取得目前位置…";
    weatherStatus.textContent = "等待位置";
    global.navigator.geolocation.getCurrentPosition(function (position) {
      var lat = position.coords.latitude;
      var lng = position.coords.longitude;
      Promise.all([updateRegion(lat, lng), updateWeather(lat, lng)]).then(function () {
        setBusy(false);
      });
    }, showLocationError, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  }

  refreshButton.addEventListener("click", requestLocation);
  requestLocation();
})(window);
