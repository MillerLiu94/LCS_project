(function () {
  "use strict";

  var mockData = window.CommunityMockData || {};
  Array.prototype.forEach.call(document.querySelectorAll("[data-mock]"), function (element) {
    var value = mockData[element.getAttribute("data-mock")];
    if (typeof value !== "string") return;

    if ("value" in element) element.value = value;
    else element.textContent = value;
  });

  if (window.CommunityInteractions) {
    window.CommunityInteractions.applyReportDeviceGate();
  }
})();
