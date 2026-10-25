(function (global) {
  "use strict";

  var config = global.CommunityConfig || {};
  var loadPromise;
  var defaultCenter = { lat: 25.033, lng: 121.5654 };

  function loadGoogleMaps() {
    if (global.google && global.google.maps && global.google.maps.importLibrary) {
      return Promise.resolve(global.google.maps);
    }
    if (loadPromise) return loadPromise;
    if (!config.googleMapsApiKey) {
      return Promise.reject(new Error("尚未設定 Google Maps API Key（GOOGLE_MAPS_API_KEY）。"));
    }
    loadPromise = new Promise(function (resolve, reject) {
      var callbackName = "__communityGoogleMapsReady";
      var script = document.createElement("script");
      var params = new URLSearchParams({
        key: config.googleMapsApiKey,
        v: "weekly",
        loading: "async",
        callback: callbackName,
        language: "zh-TW",
        region: "TW",
      });
      global[callbackName] = function () {
        delete global[callbackName];
        resolve(global.google.maps);
      };
      script.src = "https://maps.googleapis.com/maps/api/js?" + params.toString();
      script.async = true;
      script.onerror = function () { reject(new Error("Google 地圖載入失敗，請確認 API Key、帳單與網域限制。")); };
      document.head.appendChild(script);
    });
    return loadPromise;
  }

  function create(container, initialLocation, onLocationChange) {
    return loadGoogleMaps().then(function (maps) {
      return maps.importLibrary("maps").then(function (library) {
        var hasLocation = Boolean(initialLocation && Number.isFinite(Number(initialLocation.lat)) &&
          Number.isFinite(Number(initialLocation.lng)));
        var busy = false;
        var center = hasLocation ? { lat: Number(initialLocation.lat), lng: Number(initialLocation.lng) } : defaultCenter;
        var map = new library.Map(container, {
          center: center,
          zoom: hasLocation ? 16 : 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
        });
        var marker = new maps.Marker({ map: hasLocation ? map : null, position: center, title: "已選位置", draggable: true });
        var nudgeButtons = Array.prototype.slice.call(document.querySelectorAll(".map-nudge .nudge-button"));

        function updateNudgeButtons() {
          nudgeButtons.forEach(function (button) { button.disabled = busy || !hasLocation; });
        }

        function emitLocation(position) {
          if (!busy && onLocationChange) onLocationChange(position);
        }

        map.addListener("click", function (event) {
          if (!busy && event.latLng) emitLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() });
        });
        marker.addListener("dragend", function () {
          var position = marker.getPosition();
          if (position) emitLocation({ lat: position.lat(), lng: position.lng() });
        });
        nudgeButtons.forEach(function (button) {
          button.addEventListener("click", function () {
            if (busy || !hasLocation) return;
            var position = marker.getPosition();
            var direction = button.getAttribute("data-nudge");
            var latitudeStep = 0.0001;
            var longitudeStep = latitudeStep / Math.max(Math.cos(position.lat() * Math.PI / 180), 0.2);
            var offsets = {
              up: { lat: latitudeStep, lng: 0 },
              down: { lat: -latitudeStep, lng: 0 },
              left: { lat: 0, lng: -longitudeStep },
              right: { lat: 0, lng: longitudeStep },
            };
            var offset = offsets[direction];
            if (offset) emitLocation({ lat: position.lat() + offset.lat, lng: position.lng() + offset.lng });
          });
        });
        updateNudgeButtons();

        return {
          setLocation: function (location) {
            if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
              hasLocation = false;
              marker.setMap(null);
              updateNudgeButtons();
              return;
            }
            hasLocation = true;
            var position = { lat: Number(location.lat), lng: Number(location.lng) };
            marker.setPosition(position);
            marker.setMap(map);
            map.panTo(position);
            map.setZoom(Math.max(map.getZoom() || 0, 16));
            updateNudgeButtons();
          },
          setBusy: function (value) {
            busy = Boolean(value);
            marker.setDraggable(!busy && hasLocation);
            updateNudgeButtons();
          },
        };
      });
    });
  }

  global.GoogleMapsPreview = { create: create };
})(window);
