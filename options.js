const jiraUrlInput = document.getElementById("jiraUrl");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");

function showStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", !!isError);
  statusEl.classList.add("visible");
  setTimeout(() => statusEl.classList.remove("visible"), 3000);
}

function normalizeUrl(raw) {
  let url = raw.trim().replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  return url;
}

// Load saved URL on open
chrome.storage.sync.get("jiraBaseUrl", ({ jiraBaseUrl }) => {
  if (jiraBaseUrl) jiraUrlInput.value = jiraBaseUrl;
});

saveBtn.addEventListener("click", async () => {
  const url = normalizeUrl(jiraUrlInput.value);
  if (!url) {
    showStatus("Please enter a valid URL.", true);
    return;
  }

  // Validate it looks like a URL
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    showStatus("Invalid URL format.", true);
    return;
  }

  // Request host permission for this origin
  const origin = parsed.origin + "/*";
  let granted;
  try {
    granted = await chrome.permissions.request({ origins: [origin] });
  } catch (err) {
    showStatus("Permission request failed: " + err.message, true);
    return;
  }

  if (!granted) {
    showStatus("Host permission denied. The extension needs access to your Jira site.", true);
    return;
  }

  // Save and notify background
  await chrome.storage.sync.set({ jiraBaseUrl: url });
  chrome.runtime.sendMessage({ type: "URL_UPDATED", url });
  showStatus("Saved!");
});

// Load and display acknowledged banner content
function loadBannerPreview() {
  chrome.storage.local.get(["acknowledgedBannerText", "acknowledgedBannerHash"], (result) => {
    const preview = document.getElementById("bannerPreview");
    if (result.acknowledgedBannerText) {
      preview.classList.remove("empty");
      // Render the stored HTML content safely as text
      preview.textContent = stripHtml(result.acknowledgedBannerText);
    } else {
      preview.classList.add("empty");
      preview.textContent = "No banner acknowledged yet.";
    }
  });
}

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

loadBannerPreview();

resetBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove(["acknowledgedBannerHash", "acknowledgedBannerText"]);
  loadBannerPreview();
  showStatus("Banner will reappear on next Jira page load.");
});
