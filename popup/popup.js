// LinkedIn Comment Assistant - Popup Script

// Tone configurations
const TONES = {
  professional: { name: "Professional", emoji: "💼", placeholder: "e.g., Always mention my 10+ years of industry experience" },
  casual: { name: "Casual", emoji: "😊", placeholder: "e.g., Keep it light, use occasional humor" },
  supportive: { name: "Supportive", emoji: "🙌", placeholder: "e.g., Always congratulate achievements" },
  thoughtLeader: { name: "Thought Leader", emoji: "🧠", placeholder: "e.g., Reference AI/tech trends when relevant" },
  ceo: { name: "CEO / Executive", emoji: "👔", placeholder: "e.g., Speak from leadership perspective, mention team building" },
  question: { name: "Curious / Question", emoji: "❓", placeholder: "e.g., Ask about implementation details" },
  agree: { name: "Agree & Amplify", emoji: "✅", placeholder: "e.g., Share similar experiences from my career" },
  disagree: { name: "Respectful Disagree", emoji: "🤔", placeholder: "e.g., Present data-driven counterpoints" }
};

// DOM Elements
const apiKeyInput = document.getElementById('api-key');
const toggleKeyBtn = document.getElementById('toggle-key');
const keyStatus = document.getElementById('key-status');
const saveSettingsBtn = document.getElementById('save-settings');
const savePromptsBtn = document.getElementById('save-prompts');
const promptsList = document.getElementById('prompts-list');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  renderPromptsList();
  setupEventListeners();
});

// Load saved settings
async function loadSettings() {
  const storage = await chrome.storage.local.get(['openaiApiKey', 'customPrompts']);
  
  if (storage.openaiApiKey) {
    apiKeyInput.value = storage.openaiApiKey;
    showStatus(keyStatus, 'API key loaded', 'success');
  }
  
  return storage;
}

// Render prompts list
async function renderPromptsList() {
  const storage = await chrome.storage.local.get(['customPrompts']);
  const customPrompts = storage.customPrompts || {};
  
  promptsList.innerHTML = Object.entries(TONES).map(([key, tone]) => `
    <div class="prompt-item">
      <div class="prompt-header">
        <span class="prompt-emoji">${tone.emoji}</span>
        <span class="prompt-name">${tone.name}</span>
      </div>
      <textarea 
        id="prompt-${key}" 
        placeholder="${tone.placeholder}"
        rows="2"
      >${customPrompts[key] || ''}</textarea>
    </div>
  `).join('');
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
  });
  
  // Toggle password visibility
  toggleKeyBtn.addEventListener('click', () => {
    const type = apiKeyInput.type === 'password' ? 'text' : 'password';
    apiKeyInput.type = type;
  });
  
  // Save settings
  saveSettingsBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus(keyStatus, 'Please enter an API key', 'error');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      showStatus(keyStatus, 'Invalid API key format', 'error');
      return;
    }
    
    await chrome.storage.local.set({ openaiApiKey: apiKey });
    showStatus(keyStatus, 'Settings saved successfully!', 'success');
    
    // Flash the button
    saveSettingsBtn.textContent = '✓ Saved!';
    setTimeout(() => {
      saveSettingsBtn.textContent = 'Save Settings';
    }, 2000);
  });
  
  // Save custom prompts
  savePromptsBtn.addEventListener('click', async () => {
    const customPrompts = {};
    
    Object.keys(TONES).forEach(key => {
      const textarea = document.getElementById(`prompt-${key}`);
      if (textarea && textarea.value.trim()) {
        customPrompts[key] = textarea.value.trim();
      }
    });
    
    await chrome.storage.local.set({ customPrompts });
    
    // Flash the button
    savePromptsBtn.textContent = '✓ Saved!';
    setTimeout(() => {
      savePromptsBtn.textContent = 'Save Custom Prompts';
    }, 2000);
  });
}

// Show status message
function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      element.textContent = '';
      element.className = 'status';
    }, 3000);
  }
}
