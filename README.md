# Naukri Profile Updater — Chrome Extension

A Chrome extension that automatically refreshes your Naukri.com profile daily to keep it visible in recruiter searches.

Naukri ranks recently updated profiles higher. This extension handles that for you — either by tweaking your resume headline or re-uploading your resume with today's date — so you don't have to manually do it every day.

## What It Does

**Headline Mode (default):** Opens your Naukri profile, edits the Resume Headline (toggles a trailing period), and saves. That small change is enough to signal activity to Naukri's ranking algorithm.

**Resume Mode:** You upload your resume once through the extension. On every run, it renames the file with the current date (e.g., `Manthan_Sarawade_15-06-26.pdf`) and uploads it to your profile. Only one copy is maintained — the name changes daily, the file doesn't duplicate.

Both modes can run on a configurable daily schedule or be triggered manually.

## Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/manthantsarwade/Naukri-Profile-Updater-Extension.git
   ```
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the cloned folder
5. Pin the extension from the toolbar

**Requirements:**
- Must be logged into Naukri.com in the same Chrome profile
- Chrome needs to be running for scheduled updates

## Usage

1. Click the extension icon to open the popup
2. Pick your mode — Headline or Resume
3. If using Resume mode, upload your resume file (PDF/DOC/DOCX, one-time)
4. Set your preferred schedule time (defaults to 10:15 AM IST)
5. Done — it runs automatically, or hit **Run Now** for an instant update

The activity log in the popup tracks all past runs.

## Project Structure

```
manifest.json        # Extension config (Manifest V3)
background.js        # Service worker — scheduling, tab management, messaging
content.js           # Content script — interacts with Naukri's profile page DOM
popup.html           # Popup UI
popup.js             # Popup logic — mode selection, resume upload, settings
popup.css            # Styles
icons/               # Extension icons (16, 48, 128px)
```

## Permissions

| Permission | Reason |
|-----------|--------|
| `tabs` | Opens the Naukri profile page |
| `storage` | Stores settings, resume, and logs locally |
| `alarms` | Schedules the daily run |
| `scripting` | Injects the content script into the profile page |
| `host_permissions (naukri.com)` | Restricts the extension to only run on Naukri |

## Privacy

Everything runs locally. No data leaves your browser — no analytics, no external requests, no tracking. Resume files, schedule settings, and logs are all stored in `chrome.storage.local` and never transmitted anywhere.

## Contributing

Fork it, make your changes, open a PR. Bug reports and feature requests are welcome via Issues.

## License

MIT
