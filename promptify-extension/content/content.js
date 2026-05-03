/**
 * Promptify Content Script
 * Scrapes ChatGPT word counts and context history.
 */

const SELECTORS = {
  // Input area
  input: '#prompt-textarea',
  // Individual message turns
  turns: 'article, [data-testid^="conversation-turn-"]',
  // The content within each turn
  content: '.message-content, .markdown, .whitespace-pre-wrap'
};

function countWords(text) {
  if (!text) return 0;
  // Basic word count logic
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function scrapeData() {
  try {
    // 1. Scrape Current Input
    const inputEl = document.querySelector(SELECTORS.input);
    let inputText = '';
    if (inputEl) {
      // ChatGPT input is usually a div with contenteditable or a textarea
      inputText = inputEl.innerText || inputEl.value || '';
    }
    const inputWords = countWords(inputText);

    // 2. Scrape Context Memory
    // We want to count all words in the conversation so far
    const turns = document.querySelectorAll(SELECTORS.turns);
    let contextWords = 0;
    
    turns.forEach(turn => {
      // Only count turns that are NOT the one currently being typed (if it's included)
      // Usually articles are completed messages.
      contextWords += countWords(turn.innerText);
    });

    // 3. Status Check
    const isChatGPT = window.location.hostname.includes('chatgpt.com');
    const status = isChatGPT ? 'ACCESS GRANTED' : 'NOT ON CHATGPT';

    // 4. Save to storage
    chrome.storage.local.set({
      inputWords,
      contextWords,
      status
    });
  } catch (error) {
    console.error('Promptify Scraping Error:', error);
    chrome.storage.local.set({
      status: 'ERROR READING CONTEXT'
    });
  }
}

// Initial Scrape
scrapeData();

// Monitor for changes (typing, new messages, etc.)
const observer = new MutationObserver((mutations) => {
  // Throttle slightly if needed, but for now simple update is fine
  scrapeData();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// Also listen for specific input events
document.addEventListener('input', (e) => {
  if (e.target.closest(SELECTORS.input)) {
    scrapeData();
  }
}, true);
// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_INPUT') {
    const inputEl = document.querySelector(SELECTORS.input);
    const text = inputEl ? (inputEl.innerText || inputEl.value || '') : '';
    sendResponse({ text });
  } else if (request.action === 'GET_CONVO') {
    const turns = document.querySelectorAll(SELECTORS.turns);
    let fullText = '';
    turns.forEach(turn => {
      // Add speaker labels for better summarization
      const isAI = turn.querySelector('.assistant, [data-testid$="-assistant"]') !== null;
      const speaker = isAI ? 'AI: ' : 'User: ';
      fullText += `${speaker}${turn.innerText}\n\n`;
    });
    sendResponse({ text: fullText.trim() });
  } else if (request.action === 'SET_INPUT') {
    const inputEl = document.querySelector(SELECTORS.input);
    if (inputEl) {
      if (inputEl.nodeName === 'TEXTAREA') {
        inputEl.value = request.text;
      } else {
        inputEl.innerText = request.text;
      }
      // Trigger events so ChatGPT UI updates
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }
  return true;
});

// Auto-inject pending summary on load
async function checkPendingSummary() {
  const data = await chrome.storage.local.get(['pendingSummary']);
  if (data.pendingSummary) {
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds total

    const timer = setInterval(() => {
      const inputEl = document.querySelector(SELECTORS.input);
      if (inputEl) {
        clearInterval(timer);
        if (inputEl.nodeName === 'TEXTAREA') {
          inputEl.value = data.pendingSummary;
        } else {
          inputEl.innerText = data.pendingSummary;
        }
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        chrome.storage.local.remove(['pendingSummary']);
        console.log('Promptify: Pending summary injected successfully.');
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(timer);
        console.log('Promptify: Failed to find input area for pending summary.');
      }
    }, 500);
  }
}

checkPendingSummary();
