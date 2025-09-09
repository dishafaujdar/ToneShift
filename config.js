// Configuration for ToneShift Extension
// This file contains the provided API key for users to try the extension immediately

const CONFIG = {
  // Replace this with your actual Google Gemini API key
  // Users will use this key initially before setting up their own
  PROVIDED_API_KEY: 'AIzaSyDummyKeyForDemo-ReplaceWithActualKey',
  
  // API settings
  API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  MAX_TOKENS: 500,
  
  // Model configuration
  GENERATION_CONFIG: {
    maxOutputTokens: 500,
    temperature: 0.7,
    topP: 0.8,
    topK: 40
  }
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.TONESHIFT_CONFIG = CONFIG;
} else if (typeof global !== 'undefined') {
  global.TONESHIFT_CONFIG = CONFIG;
}
