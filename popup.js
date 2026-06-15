// ── Popup Logic ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const runBtn = document.getElementById("runNowBtn");
  const statusMsg = document.getElementById("statusMsg");
  const logList = document.getElementById("logList");
  const nextRunEl = document.getElementById("nextRun");
  const scheduleDisplay = document.getElementById("scheduleDisplay");
  const scheduleTimeInput = document.getElementById("scheduleTime");
  const saveTimeBtn = document.getElementById("saveTimeBtn");
  const timeSavedMsg = document.getElementById("timeSavedMsg");
  const modeDisplay = document.getElementById("modeDisplay");

  // Resume elements
  const resumeCard = document.getElementById("resumeCard");
  const resumeEmpty = document.getElementById("resumeEmpty");
  const resumeInfo = document.getElementById("resumeInfo");
  const resumeFileName = document.getElementById("resumeFileName");
  const resumeFileSize = document.getElementById("resumeFileSize");
  const resumeDateName = document.getElementById("resumeDateName");
  const resumeFileInput = document.getElementById("resumeFileInput");
  const removeResumeBtn = document.getElementById("removeResumeBtn");
  const resumeMsg = document.getElementById("resumeMsg");
  const uploadBtnText = document.getElementById("uploadBtnText");
  const modeRadios = document.querySelectorAll('input[name="updateMode"]');

  // ── Load saved mode ───────────────────────────────────────
  chrome.storage.local.get("updateMode", (data) => {
    const mode = data.updateMode || "headline";
    setMode(mode);
  });

  // ── Mode toggle ───────────────────────────────────────────
  modeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const mode = e.target.value;
      chrome.storage.local.set({ updateMode: mode });
      setMode(mode);
    });
  });

  function setMode(mode) {
    // Set the radio button
    modeRadios.forEach((r) => {
      r.checked = r.value === mode;
    });

    // Show/hide resume card
    if (mode === "resume") {
      resumeCard.classList.remove("hidden");
      modeDisplay.textContent = "Resume";
      loadResumeInfo();
    } else {
      resumeCard.classList.add("hidden");
      modeDisplay.textContent = "Headline";
    }
  }

  // ── Resume info ───────────────────────────────────────────
  function loadResumeInfo() {
    chrome.storage.local.get(
      ["resumeOriginalName", "resumeSize", "resumeData"],
      (data) => {
        if (data.resumeOriginalName && data.resumeData) {
          showResumeInfo(data.resumeOriginalName, data.resumeSize);
        } else {
          showResumeEmpty();
        }
      }
    );
  }

  function showResumeInfo(name, size) {
    resumeEmpty.classList.add("hidden");
    resumeInfo.classList.remove("hidden");
    resumeFileName.textContent = name;
    resumeFileSize.textContent = formatFileSize(size || 0);
    resumeDateName.textContent = getDatedFileName(name);
    uploadBtnText.textContent = "📁 Replace Resume";
  }

  function showResumeEmpty() {
    resumeEmpty.classList.remove("hidden");
    resumeInfo.classList.add("hidden");
    uploadBtnText.textContent = "📁 Browse & Upload Resume";
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /** Generate the dated filename from original name using today's IST date. */
  function getDatedFileName(originalName) {
    const dot = originalName.lastIndexOf(".");
    const baseName = dot > 0 ? originalName.substring(0, dot) : originalName;
    const ext = dot > 0 ? originalName.substring(dot) : "";

    // Get today's date in IST
    const now = new Date();
    const istStr = now.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    // istStr is "DD/MM/YY" → convert to "DD-MM-YY"
    const datePart = istStr.replace(/\//g, "-");

    return `${baseName}_${datePart}${ext}`;
  }

  function showResumeMsg(text, type) {
    resumeMsg.textContent = text;
    resumeMsg.className = "resume-msg " + type;
    setTimeout(() => resumeMsg.classList.add("hidden"), 3000);
  }

  // ── Resume file upload ────────────────────────────────────
  resumeFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      showResumeMsg("❌ Only PDF, DOC, DOCX files are allowed.", "error");
      resumeFileInput.value = "";
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showResumeMsg("❌ File too large. Max 5 MB.", "error");
      resumeFileInput.value = "";
      return;
    }

    // Read as base64 and store
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result; // data:application/pdf;base64,...
      chrome.storage.local.set(
        {
          resumeData: base64Data,
          resumeOriginalName: file.name,
          resumeSize: file.size,
        },
        () => {
          showResumeInfo(file.name, file.size);
          showResumeMsg("✅ Resume uploaded & stored!", "success");
        }
      );
    };
    reader.onerror = () => {
      showResumeMsg("❌ Failed to read file.", "error");
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    resumeFileInput.value = "";
  });

  // ── Remove resume ─────────────────────────────────────────
  removeResumeBtn.addEventListener("click", () => {
    chrome.storage.local.remove(
      ["resumeData", "resumeOriginalName", "resumeSize"],
      () => {
        showResumeEmpty();
        showResumeMsg("Resume removed.", "success");
      }
    );
  });

  // ── Load saved schedule time ────────────────────────────────
  chrome.storage.local.get("scheduleTime", (data) => {
    const time = data.scheduleTime || "10:15";
    scheduleTimeInput.value = time;
    updateScheduleLabel(time);
  });

  // ── Load next scheduled run time ────────────────────────────
  function loadNextRun() {
    chrome.runtime.sendMessage({ action: "getNextRun" }, (res) => {
      if (res && res.next) {
        nextRunEl.textContent = res.next;
      } else {
        nextRunEl.textContent = "Not scheduled";
      }
    });
  }
  loadNextRun();

  // ── Format time for display ─────────────────────────────────
  function updateScheduleLabel(time24) {
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const mStr = String(m).padStart(2, "0");
    scheduleDisplay.textContent = `Daily ${h12}:${mStr} ${ampm} IST`;
  }

  // ── Save Time Button ────────────────────────────────────────
  saveTimeBtn.addEventListener("click", () => {
    const newTime = scheduleTimeInput.value; // "HH:MM" format
    if (!newTime) return;

    // Save to storage and tell background to reschedule
    chrome.storage.local.set({ scheduleTime: newTime }, () => {
      chrome.runtime.sendMessage(
        { action: "updateSchedule", time: newTime },
        () => {
          // Show confirmation
          timeSavedMsg.classList.remove("hidden");
          setTimeout(() => timeSavedMsg.classList.add("hidden"), 2500);

          // Update display
          updateScheduleLabel(newTime);
          // Reload next-run after a brief delay so alarm is set
          setTimeout(loadNextRun, 500);
        }
      );
    });
  });

  // ── Load logs ───────────────────────────────────────────────
  function loadLogs() {
    chrome.runtime.sendMessage({ action: "getLogs" }, (res) => {
      const logs = res?.logs || [];
      if (logs.length === 0) {
        logList.innerHTML = '<p class="empty-log">No activity yet.</p>';
        return;
      }
      logList.innerHTML = logs
        .map(
          (l) =>
            `<div class="log-entry ${l.success ? "" : "fail"}">
              <span class="log-time">${l.time}</span><br/>
              <span class="log-msg">${l.message}</span>
            </div>`
        )
        .join("");
    });
  }
  loadLogs();

  // ── Show status ─────────────────────────────────────────────
  function showStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className = "status-msg " + type;
  }

  // ── Run Now ─────────────────────────────────────────────────
  runBtn.addEventListener("click", () => {
    // Check if resume mode is selected but no resume uploaded
    const selectedMode = document.querySelector(
      'input[name="updateMode"]:checked'
    ).value;

    if (selectedMode === "resume") {
      chrome.storage.local.get("resumeData", (data) => {
        if (!data.resumeData) {
          showStatus("❌ Upload a resume first!", "error");
          return;
        }
        triggerRun();
      });
    } else {
      triggerRun();
    }
  });

  function triggerRun() {
    runBtn.disabled = true;
    runBtn.classList.add("running");
    runBtn.textContent = "⏳ Running…";
    showStatus("Opening Naukri profile and updating…", "info");

    chrome.runtime.sendMessage({ action: "runNow" }, () => {
      // The update runs asynchronously. Poll logs after some time.
      setTimeout(() => {
        runBtn.disabled = false;
        runBtn.classList.remove("running");
        runBtn.textContent = "▶ Run Now";
        loadLogs();

        // Check latest log for result
        chrome.runtime.sendMessage({ action: "getLogs" }, (res) => {
          const latest = res?.logs?.[0];
          if (latest) {
            showStatus(latest.message, latest.success ? "success" : "error");
          }
        });
      }, 18000); // Wait ~18s for the full flow
    });
  }
});
