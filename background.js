// ============================================================
// Background Service Worker — Naukri Profile Updater
// Handles: scheduling the daily alarm at user-configured time,
// responding to manual "Run Now" requests from popup, and
// orchestrating the content-script workflow via messaging.
// Supports two modes: "headline" (default) and "resume".
// ============================================================

const NAUKRI_PROFILE_URL =
  "https://www.naukri.com/mnjuser/profile?id=&altresid";

const ALARM_NAME = "naukriDailyUpdate";
const DEFAULT_TIME = "10:15"; // Default schedule: 10:15 AM IST

// ── Helpers ──────────────────────────────────────────────────

/** Persist a log entry so the popup can display history. */
async function addLog(message, success = true) {
  const entry = {
    time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    message,
    success,
  };
  const { logs = [] } = await chrome.storage.local.get("logs");
  logs.unshift(entry);                       // newest first
  if (logs.length > 50) logs.length = 50;    // keep last 50
  await chrome.storage.local.set({ logs });
}

/** Get the user-configured time (or default). Returns "HH:MM". */
async function getScheduleTime() {
  const data = await chrome.storage.local.get("scheduleTime");
  return data.scheduleTime || DEFAULT_TIME;
}

/** Format "HH:MM" (24h) into a readable "H:MM AM/PM" string. */
function formatTime12(time24) {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Calculate delay-in-minutes until the next occurrence of the given time (IST). */
function minutesUntilTargetTime(time24) {
  const [targetH, targetM] = time24.split(":").map(Number);
  const now = new Date();

  // Get current IST time
  const istOffset = 5.5 * 60; // IST is UTC+5:30 in minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = utcMinutes + istOffset;

  const targetMinutes = targetH * 60 + targetM;

  let diffMinutes = targetMinutes - (istMinutes % (24 * 60));
  if (diffMinutes <= 0) {
    diffMinutes += 24 * 60; // schedule for tomorrow
  }

  return diffMinutes;
}

/** Schedule (or reschedule) the daily alarm using stored time. */
async function scheduleDailyAlarm() {
  const time = await getScheduleTime();
  const delayMinutes = minutesUntilTargetTime(time);
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: delayMinutes,
    periodInMinutes: 24 * 60, // repeat every 24 hours
  });
  console.log(
    `[Naukri Updater] Alarm set for ${formatTime12(time)} IST — fires in ${delayMinutes.toFixed(1)} min, then every 24 h.`
  );
}

/**
 * Generate the dated filename from original name using today's IST date.
 * E.g. "Manthan_Sarawade.pdf" → "Manthan_Sarawade_15-06-26.pdf"
 */
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

// ── Core workflow ────────────────────────────────────────────

/**
 * Opens (or reuses) the Naukri profile tab, waits for it to
 * load, then sends the appropriate update message to the content
 * script based on the selected mode.
 */
async function runUpdate(source = "alarm") {
  try {
    // Determine which mode to run
    const { updateMode = "headline" } = await chrome.storage.local.get("updateMode");

    await addLog(`Update triggered (${source}) — mode: ${updateMode}…`);

    // If resume mode, verify resume is stored
    if (updateMode === "resume") {
      const { resumeData, resumeOriginalName } = await chrome.storage.local.get([
        "resumeData",
        "resumeOriginalName",
      ]);
      if (!resumeData || !resumeOriginalName) {
        await addLog("❌ No resume uploaded. Upload one in the extension popup.", false);
        return;
      }

      // Generate today's dated filename
      const datedFileName = getDatedFileName(resumeOriginalName);

      // 1. Open Naukri profile tab
      const tab = await openNaukriTab();

      // 2. Wait for load + dynamic content
      await waitForTabLoad(tab.id);
      await sleep(4000);

      // 3. Ensure content script is injected
      await ensureContentScript(tab.id);
      await sleep(1000);

      // 4. Send resume update signal with data (with retry)
      const response = await sendMessageWithRetry(tab.id, {
        action: "startResumeUpdate",
        resumeData: resumeData,
        fileName: datedFileName,
      });

      if (response && response.success) {
        await addLog(`✅ Resume uploaded as "${datedFileName}"!`);
      } else {
        const reason = response?.error || "Unknown error";
        await addLog(`❌ Resume update failed: ${reason}`, false);
      }
    } else {
      // Headline mode (existing flow)
      const tab = await openNaukriTab();
      await waitForTabLoad(tab.id);
      await sleep(4000);

      // Ensure content script is injected
      await ensureContentScript(tab.id);
      await sleep(1000);

      const response = await sendMessageWithRetry(tab.id, {
        action: "startUpdate",
      });

      if (response && response.success) {
        await addLog("✅ Profile headline updated successfully!");
      } else {
        const reason = response?.error || "Unknown error";
        await addLog(`❌ Headline update failed: ${reason}`, false);
      }
    }
  } catch (err) {
    console.error("[Naukri Updater] runUpdate error:", err);
    await addLog(`❌ Error: ${err.message}`, false);
  }
}

/** Open or reuse a Naukri profile tab. Returns the tab object. */
async function openNaukriTab() {
  const existingTabs = await chrome.tabs.query({
    url: "https://www.naukri.com/mnjuser/profile*",
  });

  let tab;
  if (existingTabs.length > 0) {
    tab = existingTabs[0];
    await chrome.tabs.update(tab.id, { active: true, url: NAUKRI_PROFILE_URL });
  } else {
    tab = await chrome.tabs.create({ url: NAUKRI_PROFILE_URL, active: true });
  }
  return tab;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Tab load timed out after 30 s"));
    }, 30000);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Programmatically inject content.js into the tab as a safety net.
 * If the manifest-based injection hasn't happened yet, this ensures
 * the content script is present before we try to message it.
 */
async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    console.log("[Naukri Updater] Content script injected programmatically.");
  } catch (err) {
    // Script may already be injected (duplicate guard in content.js handles this)
    console.log("[Naukri Updater] Content script injection note:", err.message);
  }
}

/**
 * Send a message to a tab with retry logic.
 * Retries up to `maxRetries` times with `delayMs` between attempts.
 * This handles the race condition where the content script listener
 * isn't registered yet even though the page has loaded.
 */
async function sendMessageWithRetry(tabId, message, maxRetries = 5, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response;
    } catch (err) {
      console.log(
        `[Naukri Updater] sendMessage attempt ${attempt}/${maxRetries} failed: ${err.message}`
      );
      if (attempt < maxRetries) {
        await sleep(delayMs);
      } else {
        throw new Error(
          `Content script not responding after ${maxRetries} attempts. ` +
          `Make sure you're logged into Naukri.`
        );
      }
    }
  }
}

// ── Event listeners ─────────────────────────────────────────

// When extension is installed or updated, set up the alarm
chrome.runtime.onInstalled.addListener(async () => {
  await scheduleDailyAlarm();
  const time = await getScheduleTime();
  await addLog(`Extension installed — scheduled daily at ${formatTime12(time)} IST.`);
});

// When browser starts, re-register the alarm
chrome.runtime.onStartup.addListener(() => {
  scheduleDailyAlarm();
});

// Alarm fires → run the update
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    runUpdate("scheduled");
  }
});

// Messages from popup (manual run, logs, schedule updates)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "runNow") {
    runUpdate("manual").then(() => sendResponse({ started: true }));
    return true;
  }

  if (msg.action === "getLogs") {
    chrome.storage.local.get("logs", (data) => {
      sendResponse({ logs: data.logs || [] });
    });
    return true;
  }

  if (msg.action === "getNextRun") {
    chrome.alarms.get(ALARM_NAME, (alarm) => {
      if (alarm) {
        const nextDate = new Date(alarm.scheduledTime);
        sendResponse({
          next: nextDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        });
      } else {
        sendResponse({ next: "Not scheduled" });
      }
    });
    return true;
  }

  // Handle schedule time update from popup
  if (msg.action === "updateSchedule") {
    (async () => {
      await scheduleDailyAlarm();
      const time = msg.time || DEFAULT_TIME;
      await addLog(`⏰ Schedule updated to ${formatTime12(time)} IST.`);
      sendResponse({ ok: true });
    })();
    return true;
  }
});
