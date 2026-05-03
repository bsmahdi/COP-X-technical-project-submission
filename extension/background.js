/**
 * Promptify Background Worker
 * Handles badge updates based on word counts and thresholds.
 */

const DEFAULTS = {
  inputYellow: 501,
  inputRed: 1001,
  contextYellow: 5001,
  contextRed: 30001
};

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    updateBadge();
  }
});

async function updateBadge() {
  const data = await chrome.storage.local.get(['inputWords', 'contextWords', 'settings']);
  const settings = data.settings || DEFAULTS;
  const inputWords = data.inputWords || 0;
  const contextWords = data.contextWords || 0;

  let inputSeverity = 0; // 0: none, 1: yellow, 2: red
  if (inputWords >= settings.inputRed) inputSeverity = 2;
  else if (inputWords >= settings.inputYellow) inputSeverity = 1;

  let contextSeverity = 0;
  if (contextWords >= settings.contextRed) contextSeverity = 2;
  else if (contextWords >= settings.contextYellow) contextSeverity = 1;

  const hits = (inputSeverity > 0 ? 1 : 0) + (contextSeverity > 0 ? 1 : 0);
  const maxSeverity = Math.max(inputSeverity, contextSeverity);

  if (hits === 0) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    // Determine text
    const badgeText = hits === 1 ? '!' : '2';
    chrome.action.setBadgeText({ text: badgeText });

    // Determine color
    // Yellow: #ffeb3b, Red: #f44336
    const bgColor = maxSeverity === 2 ? '#f44336' : '#ffeb3b';
    chrome.action.setBadgeBackgroundColor({ color: bgColor });
    
    // Set text color (white for red, black for yellow)
    // Note: setBadgeTextColor is only available in some Chrome versions/platforms,
    // but background color is the main control.
    if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: maxSeverity === 2 ? '#ffffff' : '#000000' });
    }
  }
}

// Run on startup
updateBadge();
