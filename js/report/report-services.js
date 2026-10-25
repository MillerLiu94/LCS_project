(function (global) {
  "use strict";

  var draftKey = "community-report-draft-v1";
  var databasePromise;
  var api = global.CommunityApi;

  function getDraft() {
    try {
      return JSON.parse(sessionStorage.getItem(draftKey) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function saveDraft(patch) {
    var next = Object.assign({}, getDraft(), patch);
    sessionStorage.setItem(draftKey, JSON.stringify(next));
    return next;
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise(function (resolve, reject) {
      var request = indexedDB.open("community-report", 1);
      request.onupgradeneeded = function () {
        request.result.createObjectStore("draft");
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("無法暫存申報照片。")); };
    });
    return databasePromise;
  }

  function photoRequest(mode, operation) {
    return openDatabase().then(function (database) {
      return new Promise(function (resolve, reject) {
        var transaction = database.transaction("draft", mode);
        var request = operation(transaction.objectStore("draft"));
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(request.error || new Error("照片暫存失敗。")); };
      });
    });
  }

  function toDataUri(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error("讀取照片失敗，請重新選取。")); };
      reader.readAsDataURL(file);
    });
  }

  global.ReportFlow = {
    getDraft: getDraft,
    saveDraft: saveDraft,
    saveFiles: function (files) {
      return photoRequest("readwrite", function (store) { return store.put(files, "photos"); });
    },
    getFiles: function () {
      return photoRequest("readonly", function (store) { return store.get("photos"); }).then(function (files) {
        return files || [];
      });
    },
    clearFiles: function () {
      return photoRequest("readwrite", function (store) { return store.delete("photos"); });
    },
    toDataUri: toDataUri,
    analyze: api.analyze,
    upload: api.upload,
    searchPlaces: api.searchPlaces,
    reverse: api.reverse,
    createCase: api.createCase,
    authorAccount: api.authorAccount,
  };
})(window);
