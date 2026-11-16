(function (global) {
  "use strict";

  function bind(button, options) {
    if (!button) return null;
    options = options || {};
    var recorder = null;
    var stream = null;
    var chunks = [];
    var busy = false;
    var externallyBusy = false;
    var supported = Boolean(global.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && global.CommunityApi);

    function status(message, isError) {
      if (options.onStatus) options.onStatus(message, Boolean(isError));
    }
    function releaseStream() {
      if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
    }
    function setButton(recording) {
      button.disabled = busy || externallyBusy || !supported;
      button.setAttribute("aria-pressed", String(recording));
      button.setAttribute("aria-label", recording ? "停止錄音" : "開始語音輸入");
      button.title = recording ? "停止錄音" : "語音輸入";
    }
    function extension(type) {
      if (/ogg/i.test(type)) return "ogg";
      if (/mp4/i.test(type)) return "m4a";
      return "webm";
    }
    function finish() {
      var current = recorder;
      var blob = new Blob(chunks, { type: current && current.mimeType || "audio/webm" });
      recorder = null;
      chunks = [];
      releaseStream();
      setButton(false);
      if (!blob.size) { status("錄音內容是空的，請重新錄製。", true); return; }
      busy = true;
      setButton(false);
      status("正在轉換語音…");
      global.CommunityApi.transcribe(blob, "zh", "recording." + extension(blob.type))
        .then(function (result) {
          var text = String(result && result.text || "").trim();
          if (!text) throw new Error("沒有辨識到語音，請再試一次。");
          if (options.onText) options.onText(text);
        })
        .catch(function (error) { status(error.message || "語音轉文字失敗，請再試一次。", true); })
        .finally(function () { busy = false; setButton(false); });
    }
    function stop() {
      if (!recorder || recorder.state !== "recording") return;
      status("錄音完成，正在準備辨識…");
      recorder.stop();
    }
    function start() {
      if (!supported || busy || externallyBusy) return;
      status("正在連接麥克風…");
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (mediaStream) {
        stream = mediaStream;
        chunks = [];
        var mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find(function (type) {
          return global.MediaRecorder.isTypeSupported && global.MediaRecorder.isTypeSupported(type);
        });
        recorder = new global.MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        recorder.ondataavailable = function (event) { if (event.data && event.data.size) chunks.push(event.data); };
        recorder.onstop = finish;
        recorder.onerror = function () { releaseStream(); recorder = null; chunks = []; setButton(false); status("錄音失敗，請重新嘗試。", true); };
        recorder.start(1000);
        setButton(true);
        status("正在錄音，再按一次即可送出辨識。");
      }).catch(function (error) {
        releaseStream();
        setButton(false);
        status(error.name === "NotAllowedError" ? "請允許使用麥克風，再試一次。" : "無法啟動麥克風，請再試一次。", true);
      });
    }

    if (!supported) {
      button.disabled = true;
      button.title = "此瀏覽器不支援錄音轉文字";
      status("此瀏覽器不支援錄音轉文字。", true);
      return null;
    }
    button.addEventListener("click", function () {
      if (recorder && recorder.state === "recording") stop();
      else start();
    });
    return {
      stop: stop,
      setBusy: function (value) { externallyBusy = Boolean(value); if (externallyBusy) stop(); setButton(Boolean(recorder)); },
    };
  }

  global.CommunityAudioRecorder = { bind: bind };
})(window);
