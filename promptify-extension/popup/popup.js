document.addEventListener('DOMContentLoaded', () => {
  // Update stats from storage initially
  chrome.storage.local.get(['inputWords', 'contextWords', 'status'], (result) => {
    updateUI(result.inputWords || 0, result.contextWords || 0, result.status || 'ACCESS GRANTED');
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    chrome.storage.local.get(['inputWords', 'contextWords', 'status'], (result) => {
      updateUI(result.inputWords || 0, result.contextWords || 0, result.status || 'ACCESS GRANTED');
    });
  });

  function updateUI(input, context, status) {
    document.getElementById('currentInputCount').textContent = input.toLocaleString();
    document.getElementById('contextMemoryCount').textContent = context.toLocaleString();
    document.getElementById('statusText').textContent = status;
  }
});
