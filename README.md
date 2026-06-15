# ✏️ Naukri Profile Updater — Chrome Extension

<p align="center">
  <img src="icons/icon128.png" alt="Naukri Updater Icon" width="100" />
</p>

<p align="center">
  <strong>Automatically keep your Naukri.com profile fresh and visible to recruiters — zero effort.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#privacy">Privacy</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Why?

Naukri.com ranks **recently updated profiles higher** in recruiter searches. A daily tweak to your headline or resume signals to the algorithm that you're an active job seeker — boosting your visibility without lifting a finger.

This extension automates that daily refresh so you never have to think about it.

---

## Features

| Feature | Description |
|---------|-------------|
| 🔤 **Headline Auto-Update** | Makes a tiny, reversible change to your Resume Headline daily (toggles a trailing period) |
| 📄 **Resume Auto-Upload** | Upload your resume once — it auto-renames with today's date and re-uploads daily |
| ⏰ **Custom Scheduling** | Set any time (IST) for the daily update. Defaults to 10:15 AM |
| ▶️ **Manual Run** | One-click "Run Now" button for instant updates |
| 📋 **Activity Log** | Track all update history (last 50 entries) |
| 🔒 **100% Local** | All data stays in your browser. Nothing is sent to any server |

---

## How It Works

### Mode 1: Update Headline (Default)
1. Opens your Naukri profile page
2. Clicks the Resume Headline edit button
3. Toggles a trailing period (adds/removes `.`)
4. Clicks Save

> This minimal change is enough to tell Naukri's algorithm your profile is active.

### Mode 2: Update Resume
1. You upload your resume once (e.g., `Manthan_Sarawade.pdf`)
2. On each run, the extension renames it with today's date → `Manthan_Sarawade_15-06-26.pdf`
3. Opens your Naukri profile and uploads the dated resume
4. Only 1 copy exists — the file is renamed, not duplicated

---

## Installation

### From Chrome Web Store
> 🚧 *Coming soon*

### Manual Install (Developer Mode)

1. **Download** or clone this repository:
   ```bash
   git clone https://github.com/manthantsarwade/Naukri-Profile-Updater-Extension.git
   ```

2. Open Chrome and go to:
   ```
   chrome://extensions
   ```

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **"Load unpacked"** and select the cloned folder

5. The extension icon will appear in your toolbar ✅

---

## Usage

### Prerequisites
> ⚠️ **Important:**
> - You must be **logged into Naukri.com** in the same Chrome profile where the extension is installed
> - Chrome must be **running** for scheduled updates to work

### Quick Start

1. **Click** the extension icon in the toolbar to open the popup
2. **Select mode:**
   - `🔤 Update Headline` — tweaks your resume headline (default)
   - `📄 Update Resume` — uploads your resume with today's date
3. **If using Resume mode:** Click "Browse & Upload Resume" to upload your resume file once
4. **Set schedule:** Pick your preferred update time (IST) and click Save
5. **That's it!** The extension runs automatically at the scheduled time

### Manual Trigger
Click **▶ Run Now** anytime for an instant update.

---

## Project Structure

```
📂 Naukri-Profile-Updater-Extension/
├── 📄 manifest.json        # Extension config (Manifest V3)
├── 📄 background.js        # Service worker — scheduling, orchestration
├── 📄 content.js           # Content script — DOM automation on Naukri
├── 📄 popup.html           # Extension popup UI
├── 📄 popup.js             # Popup logic — mode toggle, resume upload
├── 📄 popup.css            # Popup styles — dark theme
└── 📂 icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Platform | Chrome Extension (Manifest V3) |
| Language | Vanilla JavaScript |
| Storage | `chrome.storage.local` API |
| Scheduling | `chrome.alarms` API |
| Scripting | `chrome.scripting` + `chrome.tabs` API |
| Styling | Vanilla CSS (dark theme, Inter font) |

---

## Privacy

**This extension does NOT collect, transmit, or share any user data.**

- All settings, logs, and uploaded resumes are stored **locally** in your browser using Chrome's storage API
- The extension only interacts with `naukri.com/mnjuser/profile` — your own profile page
- No analytics, no tracking, no external requests
- Open source — verify the code yourself

---

## Permissions Explained

| Permission | Why It's Needed |
|-----------|----------------|
| `tabs` | To open and navigate to your Naukri profile page |
| `activeTab` | To interact with the active Naukri tab |
| `storage` | To save settings, logs, and resume locally |
| `alarms` | To schedule the daily auto-update |
| `scripting` | To inject the content script that performs the update |
| `host_permissions (naukri.com)` | To run automation on your Naukri profile page |

---

## Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Made with ❤️ to help job seekers stay visible on Naukri.com
</p>
