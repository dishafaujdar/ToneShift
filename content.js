// Content Script - Handles text selection and page interaction
class ToneShiftContent {
  constructor() {
    this.selectedText = '';
    this.selectionElement = null;
    this.floatingButton = null;
    this.init();
  }

  init() {
    this.createFloatingButton();
    this.bindEvents();
  }

  createFloatingButton() {
    this.floatingButton = document.createElement('div');
    this.floatingButton.innerHTML = '🎭';
    this.floatingButton.className = 'toneshift-floating-btn';
    this.floatingButton.title = 'Transform with ToneShift';
    this.floatingButton.style.cssText = `
      position: absolute;
      z-index: 10000;
      background: #2563eb;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
      user-select: none;
      border: none;
    `;

    this.floatingButton.addEventListener('mouseenter', () => {
      this.floatingButton.style.transform = 'scale(1.1)';
      this.floatingButton.style.background = '#1d4ed8';
    });

    this.floatingButton.addEventListener('mouseleave', () => {
      this.floatingButton.style.transform = 'scale(1)';
      this.floatingButton.style.background = '#2563eb';
    });

    this.floatingButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openPopupWithText();
    });

    document.body.appendChild(this.floatingButton);
  }

  bindEvents() {
    // Handle text selection
    document.addEventListener('mouseup', (e) => {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        this.handleTextSelection(e);
      }, 50);
    });

    // Hide button when clicking elsewhere
    document.addEventListener('mousedown', (e) => {
      if (e.target !== this.floatingButton) {
        this.hideFloatingButton();
      }
    });

    // Handle keyboard selection
    document.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
          e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
          (e.ctrlKey && e.key === 'a')) {
        setTimeout(() => {
          this.handleTextSelection(e);
        }, 50);
      }
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'replaceText') {
        this.replaceSelectedText(request.text);
        sendResponse({ success: true });
      }
    });

    // Handle escape key to hide button
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideFloatingButton();
      }
    });
  }

  handleTextSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      this.selectedText = selectedText;
      this.selectionElement = selection.getRangeAt(0);
      this.showFloatingButton(event);
    } else {
      this.hideFloatingButton();
    }
  }

  showFloatingButton(event) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    if (rect.width === 0 && rect.height === 0) return;

    // Position the button near the selection
    const x = rect.left + (rect.width / 2) - 16; // Center horizontally
    const y = rect.top - 40; // Above the selection

    // Ensure button stays within viewport
    const adjustedX = Math.max(10, Math.min(x, window.innerWidth - 42));
    const adjustedY = Math.max(10, y);

    this.floatingButton.style.left = `${adjustedX + window.scrollX}px`;
    this.floatingButton.style.top = `${adjustedY + window.scrollY}px`;
    this.floatingButton.style.display = 'flex';
  }

  hideFloatingButton() {
    this.floatingButton.style.display = 'none';
    this.selectedText = '';
    this.selectionElement = null;
  }

  async openPopupWithText() {
    try {
      // Store selected text for popup to access
      await chrome.storage.local.set({
        selectedText: this.selectedText,
        isFromPage: true
      });

      // Open popup by clicking the extension icon
      chrome.runtime.sendMessage({
        action: 'openPopup',
        text: this.selectedText
      });

      this.hideFloatingButton();
    } catch (error) {
      console.error('Failed to open popup with text:', error);
    }
  }

  replaceSelectedText(newText) {
    if (!this.selectionElement) {
      console.error('No selection element found');
      return false;
    }

    try {
      // Create a new range and select the original text
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(this.selectionElement);

      // Check if we can modify the selected element
      const selectedElement = this.selectionElement.commonAncestorContainer;
      
      if (selectedElement.nodeType === Node.TEXT_NODE) {
        const parent = selectedElement.parentElement;
        
        // Check if the parent is editable
        if (this.isEditableElement(parent)) {
          // For editable elements, replace the text directly
          const range = this.selectionElement.cloneRange();
          range.deleteContents();
          range.insertNode(document.createTextNode(newText));
          
          // Clear selection
          selection.removeAllRanges();
          this.hideFloatingButton();
          return true;
        } else {
          // For non-editable elements, try to replace in input/textarea
          const activeElement = document.activeElement;
          if (this.isEditableElement(activeElement)) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const value = activeElement.value;
            
            activeElement.value = value.substring(0, start) + newText + value.substring(end);
            activeElement.setSelectionRange(start, start + newText.length);
            
            // Trigger input event for frameworks
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            activeElement.dispatchEvent(new Event('change', { bubbles: true }));
            
            this.hideFloatingButton();
            return true;
          }
        }
      }

      // If we can't replace directly, copy to clipboard as fallback
      navigator.clipboard.writeText(newText).then(() => {
        this.showNotification('Text copied to clipboard! Paste to replace manually.');
      });
      
      this.hideFloatingButton();
      return true;
    } catch (error) {
      console.error('Failed to replace text:', error);
      
      // Fallback: copy to clipboard
      try {
        navigator.clipboard.writeText(newText).then(() => {
          this.showNotification('Text copied to clipboard! Paste to replace manually.');
        });
      } catch (clipboardError) {
        console.error('Failed to copy to clipboard:', clipboardError);
      }
      
      this.hideFloatingButton();
      return false;
    }
  }

  isEditableElement(element) {
    if (!element) return false;
    
    const tagName = element.tagName?.toLowerCase();
    
    // Check for input and textarea elements
    if (tagName === 'input' || tagName === 'textarea') {
      return !element.disabled && !element.readOnly;
    }
    
    // Check for contenteditable elements
    if (element.contentEditable === 'true') {
      return true;
    }
    
    // Check for editable parent
    if (element.closest('[contenteditable="true"]')) {
      return true;
    }
    
    return false;
  }

  showNotification(message) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10001;
      background: #2563eb;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      max-width: 300px;
      animation: slideInRight 0.3s ease;
    `;

    // Add animation keyframes
    if (!document.querySelector('#toneshift-animations')) {
      const style = document.createElement('style');
      style.id = 'toneshift-animations';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ToneShiftContent();
  });
} else {
  new ToneShiftContent();
}
