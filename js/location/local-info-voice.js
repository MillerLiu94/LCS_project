(function () {
  "use strict";

  var question = document.getElementById("local-info-question");
  var questionVoice = document.getElementById("question-voice");
  var questionStatus = document.getElementById("question-voice-status");
  var query = document.getElementById("location-query");
  var searchVoice = document.getElementById("voice-search");
  var searchButton = document.getElementById("search-places");
  var searchStatus = document.getElementById("status");

  function setStatus(element, message, isError) {
    if (!element) return;
    element.textContent = message;
    element.setAttribute("role", isError ? "alert" : "status");
  }

  if (question && questionVoice) {
    window.CommunityAudioRecorder.bind(questionVoice, {
      onText: function (text) {
        var existing = question.value.trimEnd();
        question.value = existing ? existing + " " + text : text;
        question.dispatchEvent(new Event("input", { bubbles: true }));
        question.focus();
        setStatus(questionStatus, "語音已轉成文字，可以編輯後查詢。");
      },
      onStatus: function (message, error) { setStatus(questionStatus, message, error); },
    });
  }

  if (query && searchVoice) {
    window.CommunityAudioRecorder.bind(searchVoice, {
      onText: function (text) {
        query.value = text;
        query.dispatchEvent(new Event("input", { bubbles: true }));
        searchButton.click();
      },
      onStatus: function (message, error) { setStatus(searchStatus, message, error); },
    });
  }
})();
