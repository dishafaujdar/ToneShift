// Background Script - Service Worker for Chrome Extension
class ToneShiftBackground {
  constructor() {
    this.init();
  }

  init() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    // Handle messages from content script and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle extension icon click
    chrome.action.onClicked.addListener((tab) => {
      this.handleIconClick(tab);
    });

    // Handle context menu (if we want to add it later)
    this.setupContextMenu();
  }

  handleInstall(details) {
    if (details.reason === 'install') {
      // First time installation
      this.showWelcomeNotification();
      this.setupDefaultSettings();
    } else if (details.reason === 'update') {
      // Extension update
      console.log('ToneShift updated to version', chrome.runtime.getManifest().version);
    }
  }

  async setupDefaultSettings() {
    try {
      // Set default settings if not already present
      const result = await chrome.storage.sync.get(['settings']);
      if (!result.settings) {
        const defaultSettings = {
          autoShowButton: true,
          animationsEnabled: true,
          defaultTone: 'professional',
          maxHistoryItems: 5
        };
        await chrome.storage.sync.set({ settings: defaultSettings });
      }
    } catch (error) {
      console.error('Failed to setup default settings:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'openPopup':
          await this.openPopup(sender.tab);
          sendResponse({ success: true });
          break;

        case 'transformText':
          const result = await this.transformText(request.text, request.tone, request.apiKey);
          sendResponse(result);
          break;

        case 'getSettings':
          const settings = await this.getSettings();
          sendResponse(settings);
          break;

        case 'saveSettings':
          await this.saveSettings(request.settings);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ error: error.message });
    }
  }

  async openPopup(tab) {
    try {
      // The popup opens automatically when user clicks the extension icon
      // This method can be used for programmatic popup opening if needed
      console.log('Opening popup for tab:', tab.id);
    } catch (error) {
      console.error('Failed to open popup:', error);
    }
  }

  async transformText(text, tone, apiKey) {
    try {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const transformedText = data.content[0]?.text?.trim();

      if (!transformedText) {
        throw new Error('No transformed text received from API');
      }

      return { success: true, transformedText };
    } catch (error) {
      console.error('Transform API error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.sync.get(['settings', 'apiKey']);
      return {
        settings: result.settings || {},
        hasApiKey: !!result.apiKey
      };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return { settings: {}, hasApiKey: false };
    }
  }

  async saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ settings });
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  handleIconClick(tab) {
    // The popup is defined in manifest.json and opens automatically
    // This handler can be used for additional logic if needed
    console.log('Extension icon clicked on tab:', tab.id);
  }

  setupContextMenu() {
    // Optional: Add context menu for right-click text transformation
    try {
      chrome.contextMenus.create({
        id: 'toneshift-transform',
        title: 'Transform with ToneShift',
        contexts: ['selection']
      });

      chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId === 'toneshift-transform' && info.selectionText) {
          // Store selected text and open popup
          await chrome.storage.local.set({
            selectedText: info.selectionText,
            isFromPage: true
          });
          
          // The popup will automatically detect and use the stored text
        }
      });
    } catch (error) {
      // Context menus might not be available in all environments
      console.log('Context menu not available:', error.message);
    }
  }

  showWelcomeNotification() {
    // Optional: Show a welcome notification on first install
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'ToneShift Installed!',
        message: 'Click the extension icon or select text on any webpage to get started.'
      });
    } catch (error) {
      // Notifications might not be available
      console.log('Notifications not available:', error.message);
    }
  }

  // Utility method to validate API key format
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    
    // Anthropic API keys start with 'sk-ant-'
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
  }

  // Utility method to sanitize text input
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Remove potentially harmful content and limit length
    return text.trim().slice(0, 2000);
  }
}

// Initialize background script
new ToneShiftBackground();
