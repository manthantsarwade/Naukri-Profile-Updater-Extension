// ============================================================
// Content Script — Naukri Profile Updater
// Runs on: https://www.naukri.com/mnjuser/profile*
// Receives "startUpdate" or "startResumeUpdate" from background.
//
// Mode 1 — Headline Update:
//   1. Finds the Resume Headline section
//   2. Clicks the edit (pencil) icon
//   3. Slightly modifies the headline text
//   4. Clicks Save
//
// Mode 2 — Resume Update:
//   1. Finds the "Update Resume" button on the profile page
//   2. Clicks it to reveal the file input
//   3. Programmatically sets the resume file on the <input type="file">
//   4. Dispatches change event to trigger upload
//
// Each step has a ~2 s delay to mimic human interaction.
// ============================================================

(function () {
  "use strict";

  // Prevent multiple injections from registering duplicate listeners
  if (window.__naukriUpdaterListenerRegistered) return;
  window.__naukriUpdaterListenerRegistered = true;

  /** Delay helper — resolves after `ms` milliseconds. */
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Slightly modify the headline so Naukri registers a change.
   * Strategy: toggle a trailing period or trailing whitespace, or
   * swap a couple of common words around if possible.
   */
  function tweakHeadline(text) {
    let trimmed = text.trim();

    if (trimmed.endsWith(".")) {
      // Remove trailing period
      return trimmed.slice(0, -1);
    } else if (trimmed.endsWith(" ")) {
      // Remove trailing space
      return trimmed.trimEnd();
    } else {
      // Add a trailing period
      return trimmed + ".";
    }
  }

  /**
   * Convert a base64 data URL to a File object.
   * @param {string} dataUrl - e.g. "data:application/pdf;base64,JVBERi0xLj..."
   * @param {string} fileName - the desired filename e.g. "Manthan_Sarawade_15-06-26.pdf"
   * @returns {File}
   */
  function dataUrlToFile(dataUrl, fileName) {
    const [header, base64Data] = dataUrl.split(",");
    const mimeMatch = header.match(/data:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";

    const byteString = atob(base64Data);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }

    return new File([byteArray], fileName, { type: mimeType });
  }

  // ============================================================
  //  MODE 1: Headline Update (existing flow)
  // ============================================================

  /**
   * Main headline update flow.
   * Returns { success: true } or { success: false, error: "..." }
   */
  async function performUpdate() {
    window.__naukriUpdaterRunning = true;

    try {
      console.log("[Naukri Updater] Starting headline update…");

      // ── Step 1: Locate the Resume Headline section ──────────
      await delay(2000);

      // Naukri uses a widget structure. The "Resume Headline" label
      // is inside a span/div. We look for it by text content.
      let headlineSection = null;
      const allWidgets = document.querySelectorAll(".widgetHead");

      for (const widget of allWidgets) {
        // Check the heading text
        const heading = widget.querySelector("h2, .title, span");
        if (heading && /resume\s*headline/i.test(heading.textContent)) {
          headlineSection = widget;
          break;
        }
      }

      // Fallback: search more broadly
      if (!headlineSection) {
        const allHeaders = document.querySelectorAll("h2, h3, .heading, .widgetHead span");
        for (const el of allHeaders) {
          if (/resume\s*headline/i.test(el.textContent)) {
            // Walk up to the containing widget/section
            headlineSection = el.closest(".widgetHead") || el.closest(".widget-body") || el.parentElement;
            break;
          }
        }
      }

      if (!headlineSection) {
        return { success: false, error: "Could not find Resume Headline section on page." };
      }

      console.log("[Naukri Updater] Found Resume Headline section.");

      // ── Step 2: Click the Edit (pencil) icon ────────────────
      await delay(2000);

      // The edit icon is typically a span with class "edit-icon" or
      // an element with role/title containing "edit" near the headline.
      let editBtn =
        headlineSection.querySelector(".edit-icon") ||
        headlineSection.querySelector('[class*="editIcon"]') ||
        headlineSection.querySelector('[class*="pencil"]') ||
        headlineSection.querySelector("span.icon") ||
        headlineSection.querySelector("button") ||
        headlineSection.querySelector('[data-ga-track*="edit"]');

      // Broader fallback: any clickable icon near the headline
      if (!editBtn) {
        const parent =
          headlineSection.closest(".widget-body") ||
          headlineSection.closest('[class*="widget"]') ||
          headlineSection.parentElement;
        if (parent) {
          editBtn =
            parent.querySelector(".edit-icon") ||
            parent.querySelector('[class*="editIcon"]') ||
            parent.querySelector('[class*="pencil"]') ||
            parent.querySelector("span.icon") ||
            parent.querySelector('[class*="edit"]');
        }
      }

      if (!editBtn) {
        return { success: false, error: "Could not find the Edit button for Resume Headline." };
      }

      console.log("[Naukri Updater] Clicking edit button…");
      editBtn.click();

      // ── Step 3: Wait for the editor to appear ───────────────
      await delay(2000);

      // The edit form usually contains a textarea or input
      let textArea = null;

      // Try multiple selectors Naukri might use
      const editorSelectors = [
        "textarea#resumeHeadlineTxt",
        "textarea[name='resumeHeadline']",
        'textarea[placeholder*="headline"]',
        ".resumeHeadline textarea",
        "#resumeHeadlineTxt",
        "form textarea",
        ".editPage textarea",
        ".dialogueWrapper textarea",
        ".modal textarea",
        '[class*="headline"] textarea',
        "textarea",
      ];

      for (const sel of editorSelectors) {
        const candidates = document.querySelectorAll(sel);
        for (const c of candidates) {
          // Make sure it's visible
          if (c.offsetParent !== null) {
            textArea = c;
            break;
          }
        }
        if (textArea) break;
      }

      if (!textArea) {
        // Also try contenteditable divs
        const editables = document.querySelectorAll('[contenteditable="true"]');
        for (const el of editables) {
          if (el.offsetParent !== null) {
            textArea = el;
            break;
          }
        }
      }

      if (!textArea) {
        return { success: false, error: "Could not find the headline text editor (textarea)." };
      }

      console.log("[Naukri Updater] Found editor. Current value:", textArea.value || textArea.textContent);

      // ── Step 4: Modify the headline text ────────────────────
      await delay(2000);

      const currentText = textArea.value !== undefined ? textArea.value : textArea.textContent;
      const newText = tweakHeadline(currentText);

      if (textArea.value !== undefined) {
        // Standard textarea / input
        // Use native setter to trigger React/Angular change detection
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value"
        )?.set || Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(textArea, newText);
        } else {
          textArea.value = newText;
        }

        // Dispatch events so the framework picks up the change
        textArea.dispatchEvent(new Event("input", { bubbles: true }));
        textArea.dispatchEvent(new Event("change", { bubbles: true }));
        textArea.dispatchEvent(new Event("blur", { bubbles: true }));
      } else {
        // contenteditable
        textArea.textContent = newText;
        textArea.dispatchEvent(new Event("input", { bubbles: true }));
      }

      console.log("[Naukri Updater] Headline updated to:", newText);

      // ── Step 5: Click Save ──────────────────────────────────
      await delay(2000);

      let saveBtn = null;
      const saveCandidates = document.querySelectorAll(
        'button, input[type="submit"], input[type="button"], [class*="save"], [class*="Save"]'
      );

      for (const btn of saveCandidates) {
        const txt = (btn.textContent || btn.value || "").trim().toLowerCase();
        if (txt === "save" || txt === "save changes") {
          if (btn.offsetParent !== null) {
            saveBtn = btn;
            break;
          }
        }
      }

      // Fallback — any visible button whose text includes "save"
      if (!saveBtn) {
        for (const btn of saveCandidates) {
          const txt = (btn.textContent || btn.value || "").trim().toLowerCase();
          if (txt.includes("save") && btn.offsetParent !== null) {
            saveBtn = btn;
            break;
          }
        }
      }

      if (!saveBtn) {
        return { success: false, error: "Could not find the Save button." };
      }

      console.log("[Naukri Updater] Clicking Save…");
      saveBtn.click();

      // ── Done ────────────────────────────────────────────────
      await delay(2000);
      console.log("[Naukri Updater] ✅ Headline update complete!");

      return { success: true };
    } catch (err) {
      console.error("[Naukri Updater] Error:", err);
      return { success: false, error: err.message };
    } finally {
      window.__naukriUpdaterRunning = false;
    }
  }

  // ============================================================
  //  MODE 2: Resume Update
  // ============================================================

  /**
   * Resume update flow.
   * Receives the resume as a base64 data URL and the dated filename.
   * 1. Finds the "Update Resume" / upload button on the profile page
   * 2. Clicks it to trigger the file upload UI
   * 3. Finds the <input type="file"> element
   * 4. Programmatically sets the file using DataTransfer API
   * 5. Dispatches change event to trigger Naukri's handler
   *
   * @param {string} resumeDataUrl - base64 data URL of the resume
   * @param {string} fileName - dated filename e.g. "Manthan_Sarawade_15-06-26.pdf"
   * @returns {{ success: boolean, error?: string }}
   */
  async function performResumeUpdate(resumeDataUrl, fileName) {
    window.__naukriUpdaterRunning = true;

    try {
      console.log(`[Naukri Updater] Starting resume update — file: ${fileName}`);

      // ── Step 1: Locate the "Update Resume" button ───────────
      await delay(2000);

      let updateResumeBtn = null;

      // Naukri profile page has a "Update resume" or "Upload Resume" button
      // Usually in the top section with class containing "resume" and "update"
      const resumeSelectors = [
        // Direct selectors for Naukri's resume update button
        '[class*="updateResume"]',
        '[class*="uploadResume"]',
        '[id*="attachResume"]',
        '[id*="updateResume"]',
        'input[type="file"][id*="resume"]',
        'input[type="file"][name*="resume"]',
        '[class*="resume"] [class*="update"]',
        '[class*="resume"] [class*="upload"]',
      ];

      for (const sel of resumeSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          updateResumeBtn = el;
          break;
        }
      }

      // Fallback: search by text content
      if (!updateResumeBtn) {
        const allButtons = document.querySelectorAll(
          'button, a, span, div, label, [role="button"]'
        );
        for (const btn of allButtons) {
          const txt = (btn.textContent || "").trim().toLowerCase();
          if (
            (txt.includes("update resume") ||
              txt.includes("upload resume") ||
              txt.includes("update your resume")) &&
            btn.offsetParent !== null
          ) {
            updateResumeBtn = btn;
            break;
          }
        }
      }

      // Another fallback: look for any element with "attachCV" or similar
      if (!updateResumeBtn) {
        const cvSelectors = [
          '[class*="attachCV"]',
          '[class*="attachResume"]',
          '[data-ga-track*="resume"]',
          '[class*="resumeUpdate"]',
        ];
        for (const sel of cvSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            updateResumeBtn = el;
            break;
          }
        }
      }

      if (!updateResumeBtn) {
        return { success: false, error: "Could not find the 'Update Resume' button on page." };
      }

      console.log("[Naukri Updater] Found resume update element:", updateResumeBtn.tagName);

      // ── Step 2: Check if it's already a file input ──────────
      let fileInput = null;

      if (updateResumeBtn.tagName === "INPUT" && updateResumeBtn.type === "file") {
        // It's already a file input, use it directly
        fileInput = updateResumeBtn;
        console.log("[Naukri Updater] Element is already a file input.");
      } else {
        // Click the button to reveal the file input
        console.log("[Naukri Updater] Clicking the update resume button…");
        updateResumeBtn.click();
        await delay(2000);

        // Now look for the file input that appeared
        const fileInputSelectors = [
          'input[type="file"][id*="resume"]',
          'input[type="file"][name*="resume"]',
          'input[type="file"][id*="Resume"]',
          'input[type="file"][accept*="pdf"]',
          'input[type="file"][accept*=".doc"]',
          '[class*="resume"] input[type="file"]',
          '[class*="Resume"] input[type="file"]',
          '.dialogueWrapper input[type="file"]',
          '.modal input[type="file"]',
          'input[type="file"]',
        ];

        for (const sel of fileInputSelectors) {
          const candidates = document.querySelectorAll(sel);
          for (const c of candidates) {
            // Accept both visible and hidden file inputs (they're often hidden)
            fileInput = c;
            break;
          }
          if (fileInput) break;
        }
      }

      if (!fileInput) {
        return { success: false, error: "Could not find the file input element for resume upload." };
      }

      console.log("[Naukri Updater] Found file input element.");

      // ── Step 3: Create File and set it on the input ─────────
      await delay(1000);

      const file = dataUrlToFile(resumeDataUrl, fileName);
      console.log(`[Naukri Updater] Created file: ${file.name}, size: ${file.size}, type: ${file.type}`);

      // Use DataTransfer API to programmatically set the file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      console.log("[Naukri Updater] File set on input. Dispatching events…");

      // ── Step 4: Dispatch events to trigger Naukri's handler ─
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));

      // Some frameworks also listen for these
      fileInput.dispatchEvent(
        new CustomEvent("change", { bubbles: true, detail: { files: dataTransfer.files } })
      );

      // ── Step 5: Wait and verify ─────────────────────────────
      await delay(4000);

      // Look for success indicators on the page
      const successIndicators = [
        '[class*="success"]',
        '[class*="Success"]',
        '[class*="uploaded"]',
        '[class*="Uploaded"]',
      ];

      let uploadConfirmed = false;
      for (const sel of successIndicators) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) {
          uploadConfirmed = true;
          break;
        }
      }

      // Also check if the page text mentions successful upload
      if (!uploadConfirmed) {
        const pageText = document.body.innerText.toLowerCase();
        if (
          pageText.includes("resume uploaded") ||
          pageText.includes("resume updated") ||
          pageText.includes("successfully uploaded")
        ) {
          uploadConfirmed = true;
        }
      }

      console.log(`[Naukri Updater] Upload confirmed: ${uploadConfirmed}`);
      console.log(`[Naukri Updater] ✅ Resume update flow complete — "${fileName}"`);

      return { success: true };
    } catch (err) {
      console.error("[Naukri Updater] Resume update error:", err);
      return { success: false, error: err.message };
    } finally {
      window.__naukriUpdaterRunning = false;
    }
  }

  // ── Listen for the trigger from background.js ──────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "startUpdate") {
      // Headline update mode
      if (window.__naukriUpdaterRunning) {
        sendResponse({ success: false, error: "Update already in progress." });
        return;
      }
      performUpdate().then((result) => sendResponse(result));
      return true; // keep channel open for async response
    }

    if (msg.action === "startResumeUpdate") {
      // Resume update mode
      if (window.__naukriUpdaterRunning) {
        sendResponse({ success: false, error: "Update already in progress." });
        return;
      }
      performResumeUpdate(msg.resumeData, msg.fileName).then((result) =>
        sendResponse(result)
      );
      return true; // keep channel open for async response
    }
  });
})();
