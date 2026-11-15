(function (global) {
  "use strict";

  var scriptUrl = document.currentScript ? document.currentScript.src : location.href;
  var appRoot = new URL("../../", scriptUrl);
  var callbackResult = "";
  var currentUser = null;

  function processCallback() {
    var params = new URLSearchParams(location.search);
    var result = params.get("login");
    var hasCallback = result === "success" || result === "failed" || params.has("reason");
    if (!hasCallback) return;

    callbackResult = result === "failed" || params.has("reason") ? "failed" : "success";
    params.delete("login");
    params.delete("role");
    params.delete("reason");
    var query = params.toString();
    history.replaceState({}, "", location.pathname + (query ? "?" + query : "") + location.hash);
  }

  function initialize(page) {
    processCallback();
    return global.CommunityApi.getCurrentUser().then(function (user) {
      currentUser = user;
      if (page === "login" && callbackResult !== "failed") {
        location.replace(new URL("./", appRoot).href);
      }
      return user;
    }).catch(function (error) {
      currentUser = null;
      if (error.status === 401) {
        if (page === "home") {
          location.replace(new URL("pages/login/login.html", appRoot).href);
        } else if (page === "login" && callbackResult === "success") {
          callbackResult = "invalid";
        }
        return null;
      }
      if (page === "login") throw error;
      return null;
    });
  }

  global.CommunityAuth = {
    initialize: initialize,
    read: function () { return currentUser; },
    callbackResult: function () { return callbackResult; },
  };
})(window);
