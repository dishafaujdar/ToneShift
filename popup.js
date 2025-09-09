// Popup JavaScript - Main logic for the extension popup
class ToneShiftPopup {
  constructor() {
    this.selectedTone = null;
    this.selectedText = '';
    this.isFromPage = false;
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadSettings();
    await this.checkForSelectedText();
    await this.loadHistory();
  }

  bindEvents() {
    // Settings toggle
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.toggleSettings();
    });

    // API key save
    document.getElementById('saveApiKey').addEventListener('click', () => {
      this.saveApiKey();
    });

    // Text input events
    const inputText = document.getElementById('inputText');
    inputText.addEventListener('input', () => {
      this.updateCharCount();
      this.validateForm();
    });

    // Tone selection
    document.querySelectorAll('.tone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectTone(btn.dataset.tone);
      });
    });

    // Transform button
    document.getElementById('transformBtn').addEventListener('click', () => {
      this.transformText();
    });

    // Output actions
    document.getElementById('copyBtn').addEventListener('click', () => {
      this.copyToClipboard();
    });

    document.getElementById('replaceBtn').addEventListener('click', () => {
      this.replaceOnPage();
    });

    // History actions
    document.getElementById('clearHistory').addEventListener('click', () => {
      this.clearHistory();
    });

    // Status message close
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('status-close')) {
        this.hideStatus();
      }
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['apiKey']);
      if (result.apiKey) {
        document.getElementById('apiKey').value = result.apiKey;
      }
      // Don't automatically show settings - users can use provided API first
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (apiKey && !apiKey.startsWith('AIza')) {
      this.showStatus('Invalid API key format. Please use a Google Gemini API key starting with AIza', 'error');
      return;
    }

    try {
      if (apiKey) {
        await chrome.storage.sync.set({ apiKey });
        this.showStatus('Personal API key saved! You now have higher quota limits.', 'success');
      } else {
        await chrome.storage.sync.remove(['apiKey']);
        this.showStatus('API key removed. You\'ll use our provided key (limited quota).', 'success');
      }
      this.toggleSettings(false);
    } catch (error) {
      this.showStatus('Failed to save API key', 'error');
    }
  }

  toggleSettings(show = null) {
    const panel = document.getElementById('settingsPanel');
    const isVisible = !panel.classList.contains('hidden');
    
    if (show === null) {
      panel.classList.toggle('hidden');
    } else {
      panel.classList.toggle('hidden', !show);
    }
  }

  async checkForSelectedText() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we have selected text from content script
      const result = await chrome.storage.local.get(['selectedText', 'isFromPage']);
      
      if (result.selectedText) {
        document.getElementById('inputText').value = result.selectedText;
        this.selectedText = result.selectedText;
        this.isFromPage = result.isFromPage || false;
        
        // Clear the stored text
        await chrome.storage.local.remove(['selectedText', 'isFromPage']);
        
        this.updateCharCount();
        this.validateForm();
        
        // Show replace button if text is from page
        if (this.isFromPage) {
          document.getElementById('replaceBtn').classList.remove('hidden');
        }
      }
    } catch (error) {
      console.error('Failed to check for selected text:', error);
    }
  }

  updateCharCount() {
    const text = document.getElementById('inputText').value;
    const count = text.length;
    document.getElementById('charCount').textContent = count;
    
    const counter = document.getElementById('charCount');
    if (count > 1800) {
      counter.style.color = '#dc2626';
    } else if (count > 1500) {
      counter.style.color = '#f59e0b';
    } else {
      counter.style.color = '#6b7280';
    }
  }

  selectTone(tone) {
    // Remove previous selection
    document.querySelectorAll('.tone-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    // Add selection to clicked button
    document.querySelector(`[data-tone="${tone}"]`).classList.add('selected');
    this.selectedTone = tone;
    this.validateForm();
  }

  validateForm() {
    const text = document.getElementById('inputText').value.trim();
    const hasText = text.length > 0;
    const hasTone = this.selectedTone !== null;
    
    document.getElementById('transformBtn').disabled = !hasText || !hasTone;
  }

  async transformText() {
    const text = document.getElementById('inputText').value.trim();
    if (!text || !this.selectedTone) return;

    this.setLoading(true);

    try {
      // First try with user's API key if available
      const result = await chrome.storage.sync.get(['apiKey']);
      let transformResult;
      
      if (result.apiKey) {
        // User has their own API key
        transformResult = await this.callTransformAPI(text, this.selectedTone, result.apiKey);
      } else {
        // Try with provided API key (fallback)
        transformResult = await this.callTransformAPI(text, this.selectedTone, null);
      }
      
      if (transformResult) {
        this.displayResult(transformResult);
        await this.saveToHistory(text, transformResult, this.selectedTone);
        await this.loadHistory();
      }
    } catch (error) {
      console.error('Transform error:', error);
      
      if (error.message === 'PROVIDED_API_QUOTA_EXCEEDED') {
        this.showQuotaExceededMessage();
      } else if (error.message === 'NO_API_KEY') {
        this.showStatus('Please configure your API key first', 'error');
        this.toggleSettings(true);
      } else {
        this.showStatus('Failed to transform text. Please try again.', 'error');
      }
    } finally {
      this.setLoading(false);
    }
  }

  showQuotaExceededMessage() {
    const message = `
      <div style="text-align: left;">
        <strong>🚀 Our provided API quota is exhausted!</strong><br><br>
        <strong>Good news:</strong> You can get your own FREE Google Gemini API key!<br><br>
        <strong>Benefits:</strong><br>
        • 1,500 free requests per day<br>
        • 15 requests per minute<br>
        • No credit card required<br><br>
        <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #3b82f6; text-decoration: underline;">
          Click here to get your free API key →
        </a><br><br>
        Then paste it in the settings below!
      </div>
    `;
    
    document.getElementById('statusMessage').innerHTML = `
      <div class="status-message info" style="white-space: normal; line-height: 1.4;">
        <span class="status-text">${message}</span>
        <button class="status-close" onclick="this.parentElement.parentElement.classList.add('hidden')">×</button>
      </div>
    `;
    
    document.getElementById('statusMessage').classList.remove('hidden');
    this.toggleSettings(true);
  }

  async callTransformAPI(text, tone, apiKey) {
    // Use background script for API calls to handle both provided and user keys
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'transformText',
        text: text,
        tone: tone,
        apiKey: apiKey
      }, (response) => {
        if (response.success) {
          resolve(response.transformedText);
        } else {
          if (response.error === 'PROVIDED_API_QUOTA_EXCEEDED') {
            reject(new Error('PROVIDED_API_QUOTA_EXCEEDED'));
          } else if (response.error === 'NO_API_KEY') {
            reject(new Error('NO_API_KEY'));
          } else {
            reject(new Error(response.error || 'Unknown error'));
          }
        }
      });
    });
  }

  displayResult(transformedText) {
    document.getElementById('outputText').textContent = transformedText;
    document.getElementById('outputSection').classList.remove('hidden');
    
    // Reset copy button
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.classList.remove('copied');
    copyBtn.innerHTML = '<span class="btn-icon">📋</span>Copy';
  }

  async copyToClipboard() {
    const text = document.getElementById('outputText').textContent;
    
    try {
      await navigator.clipboard.writeText(text);
      const copyBtn = document.getElementById('copyBtn');
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = '<span class="btn-icon">✓</span>Copied!';
      
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = '<span class="btn-icon">📋</span>Copy';
      }, 2000);
    } catch (error) {
      this.showStatus('Failed to copy to clipboard', 'error');
    }
  }

  async replaceOnPage() {
    const transformedText = document.getElementById('outputText').textContent;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'replaceText',
        text: transformedText
      });
      
      this.showStatus('Text replaced on page!', 'success');
    } catch (error) {
      this.showStatus('Failed to replace text on page', 'error');
    }
  }

  async saveToHistory(original, transformed, tone) {
    try {
      const result = await chrome.storage.local.get(['history']);
      const history = result.history || [];
      
      const entry = {
        original,
        transformed,
        tone,
        timestamp: Date.now()
      };
      
      // Add to beginning and limit to 5 items
      history.unshift(entry);
      if (history.length > 5) {
        history.splice(5);
      }
      
      await chrome.storage.local.set({ history });
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  }

  async loadHistory() {
    try {
      const result = await chrome.storage.local.get(['history']);
      const history = result.history || [];
      
      const historyList = document.getElementById('historyList');
      const historySection = document.getElementById('historySection');
      
      if (history.length === 0) {
        historySection.classList.add('hidden');
        return;
      }
      
      historySection.classList.remove('hidden');
      historyList.innerHTML = '';
      
      history.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
          <div class="history-tone">${entry.tone.charAt(0).toUpperCase() + entry.tone.slice(1)}</div>
          <div class="history-text">${entry.transformed}</div>
        `;
        
        item.addEventListener('click', () => {
          document.getElementById('inputText').value = entry.original;
          document.getElementById('outputText').textContent = entry.transformed;
          document.getElementById('outputSection').classList.remove('hidden');
          this.selectTone(entry.tone);
          this.updateCharCount();
          this.validateForm();
        });
        
        historyList.appendChild(item);
      });
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  async clearHistory() {
    try {
      await chrome.storage.local.remove(['history']);
      document.getElementById('historySection').classList.add('hidden');
      this.showStatus('History cleared', 'success');
    } catch (error) {
      this.showStatus('Failed to clear history', 'error');
    }
  }

  setLoading(loading) {
    const btn = document.getElementById('transformBtn');
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.loading-spinner');
    
    if (loading) {
      btn.disabled = true;
      btnText.textContent = 'Transforming...';
      spinner.classList.remove('hidden');
    } else {
      btn.disabled = false;
      btnText.textContent = 'Transform Text';
      spinner.classList.add('hidden');
      this.validateForm();
    }
  }

  showStatus(message, type = 'success') {
    const statusEl = document.getElementById('statusMessage');
    const textEl = statusEl.querySelector('.status-text');
    
    textEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.classList.remove('hidden');
    
    setTimeout(() => {
      this.hideStatus();
    }, 4000);
  }

  hideStatus() {
    document.getElementById('statusMessage').classList.add('hidden');
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ToneShiftPopup();
});
