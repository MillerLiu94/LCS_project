(function () {
  "use strict";

  var flow = window.ReportFlow;
  var message = document.getElementById("progress-status");
  var progress = document.getElementById("upload-progress");
  var retry = document.getElementById("retry-processing");
  if (!message || !progress || !retry) return;
  var busy = false;

  function status(text, error) {
    message.textContent = text;
    message.setAttribute("role", error ? "alert" : "status");
  }

  function validLocation(location) {
    return location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng));
  }

  function finishAt(url) {
    window.location.href = url;
  }

  function processReport() {
    if (busy) return;
    busy = true;
    retry.hidden = true;
    status("正在讀取申報照片…");
    progress.hidden = true;

    flow.getFiles().then(function (files) {
      if (!files.length) throw new Error("找不到申報照片，請返回重新選擇。");
      var draft = flow.getDraft();
      var tasks = [];

      if (!draft.analysis) {
        status("正在分析照片內容…");
        tasks.push(Promise.all(files.map(flow.toDataUri)).then(flow.analyze).then(function (analysis) {
          var categoryId = Number(analysis && analysis.category_id);
          if (!analysis || analysis.error || !Number.isInteger(categoryId) || categoryId <= 0 || !analysis.description) {
            throw new Error((analysis && analysis.error) || "照片分析結果不完整，請重試。");
          }
          flow.saveDraft({ analysis: analysis });
        }));
      }

      if (!Array.isArray(draft.uploadedPaths) || draft.uploadedPaths.length !== files.length) {
        status("正在上傳照片…");
        tasks.push(flow.upload(files, function (percent) {
          progress.hidden = false;
          progress.value = percent;
          progress.setAttribute("aria-label", "照片上傳進度 " + percent + "%");
          status("正在上傳照片 " + percent + "%…");
        }).then(function (result) {
          if (!result || !Array.isArray(result.paths) || result.paths.length !== files.length) {
            throw new Error("照片上傳結果不完整，請重試。");
          }
          flow.saveDraft({ uploadedPaths: result.paths });
        }));
      }

      return Promise.all(tasks).then(function () {
        var current = flow.getDraft();
        var imageLocation = current.analysis.location;
        if (!validLocation(imageLocation)) {
          flow.saveDraft({ location: null });
          finishAt("location-recognition.html");
          return;
        }

        var savedLocation = current.location;
        var alreadyResolved = savedLocation && savedLocation.source === "exif" &&
          Number(savedLocation.lat) === Number(imageLocation.lat) &&
          Number(savedLocation.lng) === Number(imageLocation.lng) && savedLocation.address;
        if (alreadyResolved) {
          finishAt("report-review.html");
          return;
        }

        status("正在確認照片中的位置…");
        return flow.reverse(imageLocation.lat, imageLocation.lng).then(function (result) {
          var address = (result && result.address) || imageLocation.lat + ", " + imageLocation.lng;
          flow.saveDraft({
            location: {
              lat: Number(imageLocation.lat),
              lng: Number(imageLocation.lng),
              address: address,
              source: "exif",
            },
          });
        }).catch(function () {
          flow.saveDraft({
            location: {
              lat: Number(imageLocation.lat),
              lng: Number(imageLocation.lng),
              address: imageLocation.lat + ", " + imageLocation.lng,
              source: "exif",
            },
          });
        }).then(function () { finishAt("report-review.html"); });
      });
    }).catch(function (error) {
      status(error.message || "處理申報時發生錯誤，請重試。", true);
      retry.hidden = false;
    }).finally(function () {
      busy = false;
    });
  }

  retry.addEventListener("click", processReport);
  processReport();
})();