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
    } else if (value >= yellowLimit) {
      element.classList.add('state-yellow');
    } else {
      element.classList.add('state-white');
    }
  }
});
