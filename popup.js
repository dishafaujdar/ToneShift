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
      } else {
        // Show settings if no API key
        this.toggleSettings(true);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
      this.showStatus('Please enter a valid API key', 'error');
      return;
    }

    if (!apiKey.startsWith('sk-ant-')) {
      this.showStatus('Invalid API key format. Please use an Anthropic API key starting with sk-ant-', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({ apiKey });
      this.showStatus('API key saved successfully!', 'success');
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

    // Check API key
    const result = await chrome.storage.sync.get(['apiKey']);
    if (!result.apiKey) {
      this.showStatus('Please configure your API key first', 'error');
      this.toggleSettings(true);
      return;
    }

    this.setLoading(true);

    try {
      const transformedText = await this.callTransformAPI(text, this.selectedTone, result.apiKey);
      
      if (transformedText) {
        this.displayResult(transformedText);
        await this.saveToHistory(text, transformedText, this.selectedTone);
        await this.loadHistory();
      }
    } catch (error) {
      console.error('Transform error:', error);
      this.showStatus('Failed to transform text. Please try again.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async callTransformAPI(text, tone, apiKey) {
    const prompts = {
      professional: "Rewrite this text in a professional, business-appropriate tone while maintaining the original meaning and key information.",
      happy: "Rewrite this text with a happy, positive, and upbeat tone while keeping the original message intact.",
      excited: "Rewrite this text with high energy and excitement while preserving the core message.",
      angry: "Rewrite this text with an angry, frustrated tone while maintaining the original intent.",
      sarcastic: "Rewrite this text with a sarcastic, witty tone while keeping the main points clear.",
      formal: "Rewrite this text in a formal, academic tone suitable for professional documents.",
      casual: "Rewrite this text in a casual, conversational tone as if talking to a friend.",
      friendly: "Rewrite this text in a warm, friendly tone that feels welcoming and approachable."
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are a text transformation assistant. ${prompts[tone]} Return only the rewritten text without any additional commentary or explanations.

Text to transform: ${text}`
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    }

    const data = await response.json();
    return data.content[0]?.text?.trim();
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
