const CONTENT_SCRIPT_ID = "jira-banner-manager-cs";

async function registerContentScript(jiraBaseUrl) {
  // Unregister any existing content script first
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  } catch {
    // Ignore — may not exist yet
  }

  if (!jiraBaseUrl) return;

  const pattern = jiraBaseUrl.replace(/\/$/, "") + "/*";

  try {
    await chrome.scripting.registerContentScripts([
      {
        id: CONTENT_SCRIPT_ID,
        matches: [pattern],
        js: ["content.js"],
        css: ["content.css"],
        runAt: "document_idle",
      },
    ]);
    console.log("[JBM] Content script registered for", pattern);
  } catch (err) {
    console.error("[JBM] Failed to register content script:", err);
  }
}

// On install or update, register if URL already configured
chrome.runtime.onInstalled.addListener(async () => {
  const { jiraBaseUrl } = await chrome.storage.sync.get("jiraBaseUrl");
  if (jiraBaseUrl) {
    await registerContentScript(jiraBaseUrl);
  }
});

// On browser startup, re-register (service worker is ephemeral)
chrome.runtime.onStartup.addListener(async () => {
  const { jiraBaseUrl } = await chrome.storage.sync.get("jiraBaseUrl");
  if (jiraBaseUrl) {
    await registerContentScript(jiraBaseUrl);
  }
});

// Listen for URL updates from the options page
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "URL_UPDATED") {
    registerContentScript(message.url).then(() => sendResponse({ ok: true }));
    return true; // keep message channel open for async response
  }
});
