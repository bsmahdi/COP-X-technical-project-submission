document.addEventListener('DOMContentLoaded', () => {
  const mainView = document.getElementById('mainView');
  const settingsView = document.getElementById('settingsView');
  const settingsBtn = document.getElementById('settingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const closeBtn = document.getElementById('closeBtn');

  // Elements for values
  const inputWordsEl = document.getElementById('currentInputCount');
  const contextWordsEl = document.getElementById('contextMemoryCount');
  const statusEl = document.getElementById('statusText');
  const inputCard = document.getElementById('inputCard');
  const contextCard = document.getElementById('contextCard');

  // Settings Inputs
  const inputYellowInp = document.getElementById('inputYellow');
  const inputRedInp = document.getElementById('inputRed');
  const contextYellowInp = document.getElementById('contextYellow');
  const contextRedInp = document.getElementById('contextRed');

  const DEFAULTS = {
    inputYellow: 501,
    inputRed: 1001,
    contextYellow: 5001,
    contextRed: 30001
  };

  let currentSettings = { ...DEFAULTS };

  // 1. Initial Load
  chrome.storage.local.get(['inputWords', 'contextWords', 'status', 'settings'], (result) => {
    if (result.settings) {
      currentSettings = { ...DEFAULTS, ...result.settings };
    }
    updateSettingsInputs(currentSettings);
    updateUI(
      result.inputWords || 0,
      result.contextWords || 0,
      result.status || 'ACCESS GRANTED'
    );
  });

  // 2. Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    chrome.storage.local.get(['inputWords', 'contextWords', 'status', 'settings'], (result) => {
      if (result.settings) {
        currentSettings = { ...DEFAULTS, ...result.settings };
      }
      updateUI(
        result.inputWords || 0,
        result.contextWords || 0,
        result.status || 'ACCESS GRANTED'
      );
    });
  });

  // 3. UI Toggle
  settingsBtn.addEventListener('click', () => {
    mainView.style.display = 'none';
    settingsView.style.display = 'block';
  });

  saveSettingsBtn.addEventListener('click', () => {
    const newSettings = {
      inputYellow: parseInt(inputYellowInp.value) || DEFAULTS.inputYellow,
      inputRed: parseInt(inputRedInp.value) || DEFAULTS.inputRed,
      contextYellow: parseInt(contextYellowInp.value) || DEFAULTS.contextYellow,
      contextRed: parseInt(contextRedInp.value) || DEFAULTS.contextRed
    };
    
    chrome.storage.local.set({ settings: newSettings }, () => {
      currentSettings = newSettings;
      settingsView.style.display = 'none';
      mainView.style.display = 'block';
      // Trigger a UI update with current data
      chrome.storage.local.get(['inputWords', 'contextWords', 'status'], (res) => {
        updateUI(res.inputWords || 0, res.contextWords || 0, res.status || 'ACCESS GRANTED');
      });
    });
  });

  closeBtn.addEventListener('click', () => {
    window.close();
  });

  // Optimization logic
  const optimizeBtn = document.getElementById('optimizeBtn');
  
  chrome.storage.local.get(['isOptimized', 'originalPrompt'], (res) => {
    if (res.isOptimized) {
      optimizeBtn.textContent = '↩️';
    }
  });

  optimizeBtn.addEventListener('click', async () => {
    console.log('Optimize button clicked');
    const data = await chrome.storage.local.get(['isOptimized', 'originalPrompt']);
    console.log('Current state:', data);
    
    if (data.isOptimized) {
      // Revert logic
      optimizeBtn.classList.add('spinning');
      const success = await setInputText(data.originalPrompt);
      if (success) {
        chrome.storage.local.set({ isOptimized: false, originalPrompt: '' });
        optimizeBtn.textContent = '🔄';
      }
      optimizeBtn.classList.remove('spinning');
      return;
    }

    // Optimize logic
    optimizeBtn.classList.add('spinning');
    
    try {
      const text = await getInputText();
      if (!text) {
        optimizeBtn.classList.remove('spinning');
        return;
      }
      
      const response = await fetch('http://localhost:3000/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const result = await response.json();
      console.log('API Result:', result);
      if (result && result.optimizedText) {
        const success = await setInputText(result.optimizedText);
        if (success) {
          chrome.storage.local.set({ 
            isOptimized: true, 
            originalPrompt: text 
          });
          optimizeBtn.textContent = '↩️';
        }
      }
    } catch (err) {
      console.error('Optimization failed:', err);
      statusEl.textContent = 'SERVER OFFLINE';
    } finally {
      optimizeBtn.classList.remove('spinning');
    }
  });

  // New Chat logic
  const newChatBtn = document.getElementById('newChatBtn');

  newChatBtn.addEventListener('click', async () => {
    newChatBtn.classList.add('spinning');
    try {
      const text = await getConvoText();
      if (!text) {
        newChatBtn.classList.remove('spinning');
        return;
      }

      const response = await fetch('http://localhost:3000/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const result = await response.json();
      if (result && result.summaryText) {
        // Store for injection in new tab
        await chrome.storage.local.set({ pendingSummary: result.summaryText });
        // Open new tab
        chrome.tabs.create({ url: 'https://chatgpt.com/' });
      }
    } catch (err) {
      console.error('Summarization failed:', err);
      statusEl.textContent = 'SERVER OFFLINE';
    } finally {
      newChatBtn.classList.remove('spinning');
    }
  });

  async function getConvoText() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return '';
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: 'GET_CONVO' }, (response) => {
        resolve(response ? response.text : '');
      });
    });
  }

  async function getInputText() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return '';
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: 'GET_INPUT' }, (response) => {
        resolve(response ? response.text : '');
      });
    });
  }

  async function setInputText(text) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return false;
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: 'SET_INPUT', text }, (response) => {
        resolve(response ? response.success : false);
      });
    });
  }

  function updateSettingsInputs(settings) {
    inputYellowInp.value = settings.inputYellow;
    inputRedInp.value = settings.inputRed;
    contextYellowInp.value = settings.contextYellow;
    contextRedInp.value = settings.contextRed;
  }

  function updateUI(input, context, status) {
    inputWordsEl.textContent = input.toLocaleString();
    contextWordsEl.textContent = context.toLocaleString();
    statusEl.textContent = status;

    // Apply color logic
    applyColorState(inputCard, input, currentSettings.inputYellow, currentSettings.inputRed);
    applyColorState(contextCard, context, currentSettings.contextYellow, currentSettings.contextRed);
  }

  function applyColorState(element, value, yellowLimit, redLimit) {
    element.classList.remove('state-white', 'state-yellow', 'state-red', 'card-white', 'card-orange');
    
    if (value >= redLimit) {
      element.classList.add('state-red');
      if (element.id === 'contextCard') newChatBtn.style.display = 'flex';
    } else if (value >= yellowLimit) {
      element.classList.add('state-yellow');
      if (element.id === 'contextCard') newChatBtn.style.display = 'flex';
    } else {
      element.classList.add('state-white');
      if (element.id === 'contextCard') newChatBtn.style.display = 'none';
    }
  }
});
