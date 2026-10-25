(function (global) {
  "use strict";

  function isPhoneDevice() {
    var mobileHint = navigator.userAgentData && navigator.userAgentData.mobile;
    if (mobileHint === true) return true;

    var userAgent = navigator.userAgent || "";
    return /iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile/i.test(userAgent);
  }

  function applyReportDeviceGate() {
    var phone = isPhoneDevice();
    var desktopPreview = global.CommunityConfig && global.CommunityConfig.allowDesktopReportPreview;
    var mobileLink = document.getElementById("mobile-report-link");
    var desktopNotice = document.getElementById("desktop-report-notice");

    if (mobileLink && desktopNotice) {
      if (phone || desktopPreview) {
        mobileLink.hidden = false;
        desktopNotice.hidden = true;
      }
      return;
    }

    if (phone || desktopPreview) return;

    var main = document.createElement("main");
    main.className = "report-device-gate";
    main.innerHTML = [
      '<section class="report-device-gate__card" aria-labelledby="report-device-title">',
      '<svg class="report-device-gate__icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '<rect x="17" y="5" width="30" height="54" rx="6"></rect><path d="M27 12h10M29 51h6"></path>',
      '</svg>',
      '<h1 id="report-device-title">請使用手機申報社區事件</h1>',
      '<p>手機定位通常更適合確認事件發生的位置。請用手機開啟首頁，再進入申報流程。</p>',
      '<a class="report-device-gate__action" href="../../index.html">回首頁</a>',
      '</section>',
    ].join("");
    document.body.replaceChildren(main);
  }

  global.CommunityInteractions = {
    applyReportDeviceGate: applyReportDeviceGate,
  };
})(window);
