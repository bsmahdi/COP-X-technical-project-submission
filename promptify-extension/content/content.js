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
  return text.trim().split(/\s+/).filter(Boolean).length;
}

let originalPrompt = '';
let isShortened = false;

function injectButtons() {
  const container = document.querySelector('[grid-area="trailing"] .ms-auto') || document.querySelector(SELECTORS.input)?.parentElement;
  if (!container || document.getElementById('promptify-shorten-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'promptify-shorten-btn';
  btn.type = 'button';
  btn.innerText = 'Shorten';
  btn.style.cssText = `
    background: #f15a24;
    color: white;
    border: 2px solid #1a1310;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    margin-right: 8px;
    transition: all 0.2s;
    box-shadow: 2px 2px 0px #1a1310;
  `;

  btn.onclick = async () => {
    const inputEl = document.querySelector(SELECTORS.input);
    if (!inputEl) return;

    if (isShortened) {
      // Revert
      inputEl.value = originalPrompt;
      inputEl.innerText = originalPrompt; 
      btn.innerText = 'Shorten';
      isShortened = false;
      scrapeData();
      return;
    }

    const text = inputEl.value || inputEl.innerText;
    if (!text || text.trim().length < 10) return;

    originalPrompt = text;
    btn.innerText = '...';
    btn.disabled = true;

    try {
      const response = await fetch('http://localhost:3000/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });
      const data = await response.json();
      
      if (data.optimizedText) {
        inputEl.value = data.optimizedText;
        inputEl.innerText = data.optimizedText;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        
        btn.innerText = 'Revert';
        isShortened = true;
      } else {
        btn.innerText = 'Error';
      }
    } catch (err) {
      console.error('Shorten Error:', err);
      btn.innerText = 'Offline';
    } finally {
      btn.disabled = false;
      scrapeData();
    }
  };

  container.prepend(btn);
}

function scrapeData() {
  injectButtons(); 
  try {
    const inputEl = document.querySelector(SELECTORS.input);
    let inputText = '';
    if (inputEl) {
      inputText = inputEl.value || inputEl.innerText || '';
    }
    const inputWords = countWords(inputText);

    const turns = document.querySelectorAll(SELECTORS.turns);
    let contextWords = 0;
    let fullConvoText = '';
    
    turns.forEach(turn => {
      const text = turn.innerText;
      contextWords += countWords(text);
      fullConvoText += text + '\n\n';
    });

    const isChatGPT = window.location.hostname.includes('chatgpt.com');
    const status = isChatGPT ? 'ACCESS GRANTED' : 'NOT ON CHATGPT';

    chrome.storage.local.set({
      inputWords,
      contextWords,
      fullConvoText, 
      status
    });
  } catch (error) {
    console.error('Promptify Scraping Error:', error);
    chrome.storage.local.set({ status: 'ERROR READING CONTEXT' });
  }
}

// ... existing observer and event listener ...

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
