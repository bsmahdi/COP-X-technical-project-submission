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
