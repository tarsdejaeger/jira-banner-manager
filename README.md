# Jira Banner Manager

A Chrome extension that lets you acknowledge and auto-hide announcement banners on Jira Server / Data Center instances. Once acknowledged, a banner stays hidden until its content changes — then it automatically reappears for you to review.

## Features

- **Acknowledge banners** — An inline "✓ Acknowledge" button is added to announcement banners. Click it to hide the banner.
- **Content-aware** — The extension hashes the banner's content (SHA-256). If the admin updates the banner, it reappears automatically.
- **Review hidden banners** — The options page shows the text of the currently hidden banner so you always know what's being suppressed.
- **Reset** — One click in the options page to clear the acknowledgement and show the banner again.
- **Minimal permissions** — Only requests access to the specific Jira URL you configure.

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the project folder.

## Setup

1. Right-click the extension icon → **Options** (or find it on the `chrome://extensions` page).
2. Enter your Jira base URL (e.g. `https://jira.yourcompany.com`).
3. Click **Save**. Chrome will prompt you to grant host permission for that site.
4. Navigate to your Jira instance — the extension is now active.

## Usage

| Action | Result |
|---|---|
| Banner is visible with **✓ Acknowledge** button | Click the button to hide it |
| Page reloads | Banner stays hidden (hash matches) |
| Admin changes the banner | Banner reappears with a new **✓ Acknowledge** button |
| Open extension **Options** | See the text of the currently hidden banner |
| Click **Reset — Show Banner Again** | Clears acknowledgement; banner reappears on next page load |

## Project Structure

```
├── manifest.json      # Chrome MV3 manifest
├── background.js      # Service worker — dynamic content script registration
├── content.js         # Content script — banner detection, hashing, acknowledge/hide
├── content.css        # Styles for the injected acknowledge button
├── options.html       # Options page UI
├── options.js         # Options page logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## How It Works

1. **`background.js`** dynamically registers `content.js` for your configured Jira URL using `chrome.scripting.registerContentScripts`.
2. **`content.js`** runs on every Jira page load:
   - Looks for `#announcement-banner` or `.aui-banner` in the DOM.
   - If not found immediately, watches via `MutationObserver` (up to 10 seconds).
   - Computes a SHA-256 hash of the banner's `innerHTML`.
   - Compares it against the stored hash in `chrome.storage.local`.
   - **Match** → hides the banner completely.
   - **No match** → shows the banner with an "✓ Acknowledge" button appended.
3. **`options.js`** reads the stored banner text from `chrome.storage.local` and displays it in the options page.

## Compatibility

- **Chrome** 102+ (Manifest V3)
- **Jira Server / Data Center** (uses AUI-based `#announcement-banner` / `.aui-banner` selectors)

## License

MIT
