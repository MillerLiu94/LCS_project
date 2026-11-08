(function (global) {
  "use strict";

  var sessionKey = "communityLoginState";
  var pendingRoleKey = "communityPendingLoginRole";
  var scriptUrl = document.currentScript ? document.currentScript.src : location.href;
  var appRoot = new URL("../../", scriptUrl);
  var callbackResult = "";

  function isValidRole(role) {
    return role === "resident" || role === "staff";
  }

  function read() {
    try {
      var state = JSON.parse(localStorage.getItem(sessionKey) || "null");
      return state && isValidRole(state.role) ? state : null;
    } catch (_) {
      return null;
    }
  }

  function save(role) {
    if (!isValidRole(role)) return false;
    try {
      localStorage.setItem(sessionKey, JSON.stringify({ role: role, authenticatedAt: Date.now() }));
    } catch (_) {
      return false;
    }
    try { sessionStorage.removeItem(pendingRoleKey); } catch (_) {}
    return true;
  }

  function processCallback() {
    var params = new URLSearchParams(location.search);
    var result = params.get("login");
    if (result !== "success" && result !== "failed") return;

    callbackResult = result;
    if (result === "success") {
      var role = params.get("role");
      try { role = role || sessionStorage.getItem(pendingRoleKey); } catch (_) {}
      callbackResult = save(role) ? "success" : "invalid";
    } else {
      try { sessionStorage.removeItem(pendingRoleKey); } catch (_) {}
    }

    params.delete("login");
    params.delete("role");
    var query = params.toString();
    history.replaceState({}, "", location.pathname + (query ? "?" + query : "") + location.hash);
  }

  function initialize(page) {
    processCallback();
    var session = read();
    if (page === "login" && session && callbackResult !== "failed" && callbackResult !== "invalid") {
      location.replace(new URL("./", appRoot).href);
      return;
    }
    if (page === "home" && !session) {
      location.replace(new URL("pages/login/login.html", appRoot).href);
    }
  }

  function beginLogin(role) {
    if (!isValidRole(role)) return;
    try { sessionStorage.setItem(pendingRoleKey, role); } catch (_) {}
  }

  global.CommunityAuth = {
    initialize: initialize,
    beginLogin: beginLogin,
    read: read,
    callbackResult: function () { return callbackResult; },
  };
})(window);
