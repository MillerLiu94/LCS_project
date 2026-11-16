(function (global) {
  "use strict";

  var scriptUrl = document.currentScript ? document.currentScript.src : location.href;
  var appRoot = new URL("../../", scriptUrl);
  var callbackResult = "";
  var currentUser = null;

  function processCallback() {
    var params = new URLSearchParams(location.search);
    var result = params.get("login");
    if (result === "success" || result === "failed" || params.has("reason")) {
      callbackResult = result === "failed" || params.has("reason") ? "failed" : "success";
      params.delete("login");
      params.delete("role");
      params.delete("reason");
      history.replaceState({}, "", location.pathname + (params.toString() ? "?" + params : "") + location.hash);
    }
  }

  function returnAfterLogin() {
    var home = new URL("index.html", appRoot).href;
    var target = "";
    try { target = sessionStorage.getItem("communityAuthReturnTo") || ""; sessionStorage.removeItem("communityAuthReturnTo"); } catch (_) {}
    if (target.indexOf(appRoot.pathname) !== 0) target = home;
    global.location.replace(target);
  }

  function initialize(page) {
    processCallback();
    return global.CommunityApi.getCurrentUser().then(function (user) {
      currentUser = user;
      if (page === "login" && callbackResult !== "failed") returnAfterLogin();
      return user;
    }).catch(function (error) {
      currentUser = null;
      if (page === "home" && error.status === 401) global.CommunityApi.redirectToLogin();
      if (page === "protected" && error.status === 401) global.CommunityApi.redirectToLogin();
      if (page === "login" && callbackResult === "success" && error.status === 401) callbackResult = "invalid";
      if (page === "login" && error.status && error.status !== 401) throw error;
      return null;
    });
  }

  global.CommunityAuth = {
    initialize: initialize,
    read: function () { return currentUser; },
    callbackResult: function () { return callbackResult; },
  };
})(window);
