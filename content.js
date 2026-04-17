/* ============================================================
   Jira Banner Manager — Content Script
   Detects #announcement-banner / .aui-banner, lets user
   acknowledge it, and auto-hides until content changes.
   ============================================================ */

(function () {
  "use strict";

  const SELECTORS = ["#announcement-banner", ".aui-banner"];
  const STORAGE_KEY = "acknowledgedBannerHash";
  const STORAGE_TEXT_KEY = "acknowledgedBannerText";
  const OBSERVER_TIMEOUT = 10_000;
  const PREFIX = "jbm";

  // ── Utility: SHA-256 hash of a string ──────────────────────
  async function hashContent(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // ── Utility: get stored hash ───────────────────────────────
  function getStoredHash() {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) =>
        resolve(result[STORAGE_KEY] || null)
      );
    });
  }

  // ── Utility: save hash + text ───────────────────────────────
  function saveAcknowledged(hash, text) {
    return chrome.storage.local.set({
      [STORAGE_KEY]: hash,
      [STORAGE_TEXT_KEY]: text,
    });
  }

  // ── Find the banner element ────────────────────────────────
  function findBanner() {
    for (const sel of SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ── Inject the acknowledge button (inside banner) ──────────
  function createAcknowledgeBtn(onAck) {
    const btn = document.createElement("button");
    btn.className = `${PREFIX}-ack-btn`;
    btn.textContent = "✓ Acknowledge";
    btn.title = "Hide this banner until its content changes";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onAck();
    });
    return btn;
  }

  // ── Core logic ─────────────────────────────────────────────
  async function processBanner(banner) {
    // Skip if we already processed this exact element
    if (banner.dataset.jbmProcessed) return;
    banner.dataset.jbmProcessed = "true";

    const content = banner.innerHTML.trim();
    if (!content) return; // empty banner, ignore

    const currentHash = await hashContent(content);
    const storedHash = await getStoredHash();

    let ackBtn = null;

    // ── Hide banner completely ──────────────────────────────
    function hideBanner() {
      banner.style.display = "none";
    }

    // ── Acknowledge: save hash + text and hide ─────────────
    async function acknowledge() {
      await saveAcknowledged(currentHash, content);
      hideBanner();
    }

    // ── Ensure ack button is present ───────────────────────
    function ensureAckBtn() {
      if (ackBtn && ackBtn.parentNode) return;
      ackBtn = createAcknowledgeBtn(acknowledge);
      banner.appendChild(ackBtn);
    }

    // Decide initial state
    if (storedHash === currentHash) {
      // Already acknowledged — hide
      hideBanner();
    } else {
      // New or changed — show with ack button
      ensureAckBtn();
    }
  }

  // ── Initialization ─────────────────────────────────────────
  function init() {
    const banner = findBanner();
    if (banner) {
      processBanner(banner);
      return;
    }

    // Banner not yet in DOM — watch for it
    const observer = new MutationObserver((_mutations, obs) => {
      const b = findBanner();
      if (b) {
        obs.disconnect();
        processBanner(b);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Give up after timeout
    setTimeout(() => observer.disconnect(), OBSERVER_TIMEOUT);
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ── SPA safety net: re-check if banner reappears ──────────
  // Jira Server mostly does full reloads, but just in case.
  let recheckObserver = null;
  function setupRecheckObserver() {
    recheckObserver = new MutationObserver(() => {
      const banner = findBanner();
      if (banner && !banner.dataset.jbmProcessed) {
        processBanner(banner);
      }
    });
    recheckObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
  setupRecheckObserver();
})();
