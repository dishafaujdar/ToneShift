# ToneShift - Chrome Extension

A powerful Chrome extension that transforms text into different tones using AI. Select text on any webpage or paste it into the extension popup to change its tone to professional, happy, excited, and more!

## Features

### 🎭 **Multiple Tone Options**
- **Professional** - Business-appropriate and formal
- **Happy** - Positive and upbeat
- **Excited** - High energy and enthusiastic  
- **Angry** - Frustrated and stern
- **Sarcastic** - Witty and ironic
- **Formal** - Academic and structured
- **Casual** - Conversational and relaxed
- **Friendly** - Warm and approachable

### ✨ **Easy Text Selection**
- Select text on any webpage to see a floating button
- Click the button to instantly transform the selected text
- Or paste text directly into the extension popup

### 🔄 **Smart Text Replacement**
- Replace selected text directly on the webpage
- Works with input fields, text areas, and editable content
- Fallback to clipboard copy for protected content

### 📋 **Convenient Actions**
- One-click copy to clipboard
- View transformation history (last 5 transformations)
- Clean, minimalist interface

## Installation & Quick Start

### Instant Setup (No API Key Needed!)

1. **Download or Clone**
   ```bash
   git clone <repository-url>
   cd ToneShift
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load Extension**
   - Click "Load unpacked"
   - Select the `ToneShift` folder

4. **Start Using Immediately!**
   - Click the extension icon and start transforming text
   - Uses our provided API key for immediate access
   - No configuration required!

### Optional: Get Your Own API Key (Recommended)

For unlimited usage and higher quotas:

1. **Get Free Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with Google account
   - Click "Create API Key"
   - Copy the key (starts with `AIza`)

2. **Configure Extension**
   - Click extension icon → Settings gear ⚙️
   - Paste your API key
   - Click "Save"

## API System & Costs

### 🎁 **Provided API (Free Trial)**
- **Immediate access** - No setup required
- **Limited quota** - Shared among all users
- **Perfect for testing** the extension

### 🚀 **Your Own API Key (Recommended)**
- **Google Gemini 1.5 Flash** - Fast and reliable
- **FREE tier**: 15 requests/minute, 1,500 requests/day
- **No credit card required** for basic usage
- **Higher quotas available** with paid plans

## How to Use

### Method 1: Text Selection
1. **Select text** on any webpage
2. **Click the floating 🎭 button** that appears
3. **Choose a tone** from the options
4. **Click "Transform Text"**
5. **Copy or replace** the transformed text

### Method 2: Manual Input
1. **Click the extension icon** in your toolbar
2. **Paste or type text** in the input area
3. **Select your desired tone**
4. **Click "Transform Text"**
5. **Copy the result** to clipboard

### Additional Features

- **View History**: See your last 5 transformations
- **Reuse Previous**: Click on any history item to reload it
- **Character Limit**: Up to 2,000 characters per transformation
- **Keyboard Shortcuts**: Press Escape to hide the floating button

## Technical Details

### File Structure
```
ToneShift/
├── manifest.json          # Extension configuration
├── popup.html             # Main popup interface
├── popup.js               # Popup logic and API calls
├── content.js             # Text selection and page interaction
├── content.css            # Styles for injected elements  
├── background.js          # Service worker for API handling
├── styles.css             # Main popup styles
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Technologies Used
- **Manifest V3** - Latest Chrome extension format
- **Google Gemini API** - Gemini 1.5 Flash for text transformation
- **Chrome Storage API** - Settings and history persistence
- **Chrome Tabs API** - Page interaction and text replacement

### Browser Compatibility
- **Chrome** 88+ (Manifest V3 support)
- **Edge** 88+ (Chromium-based)
- **Other Chromium browsers** with Manifest V3 support

## Privacy & Security

### Data Handling
- **Text Processing**: Sent to Google Gemini API for transformation only
- **No Data Storage**: Text is not stored on external servers
- **Local Storage**: API keys and history stored locally in browser
- **No Tracking**: No analytics or user tracking

### Permissions Used
- `activeTab` - Access current webpage for text selection
- `storage` - Save settings and history locally
- `scripting` - Inject content script for text selection

### Security Features
- API key validation and secure storage
- Input sanitization and length limits
- Content Security Policy protection
- XSS prevention measures

## Troubleshooting

### Common Issues

### Common Issues

**"Our provided API quota is exhausted!"**
- This means our shared API key has reached its daily limit
- Simply get your own FREE Google Gemini API key
- Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and follow the setup
- Your personal key gives you 1,500 free requests per day!

**"Please configure your API key first"**
- This appears if both our provided key and your personal key are unavailable
- Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Paste it in settings (gear icon) and click "Save"

**"Failed to transform text"**
- Check your internet connection
- If using your own API key, verify it's correct and has quota remaining
- Try with shorter text (under 2000 characters)

**"Failed to replace text on page"**
- Some websites protect their content from modification
- Use the "Copy" button instead and paste manually
- The text will be copied to your clipboard automatically

**Floating button doesn't appear**
- Make sure you've selected text (highlighted)
- Try refreshing the page
- Check if the website allows content scripts

### Performance Tips
- Keep text under 1500 characters for faster processing
- Clear history periodically to free up storage
- Monitor your Google AI Studio quota usage

## Development

### Building from Source
1. Clone the repository
2. No build process required - pure JavaScript
3. Load directly in Chrome developer mode

### Contributing
- Report bugs and suggest features via issues
- Follow the existing code style and structure
- Test thoroughly across different websites

### API Rate Limits
The extension respects Google Gemini's rate limits:
- **Free tier**: 15 requests per minute, 1,500 requests per day
- **Paid tier**: Higher limits based on usage tier
- Built-in error handling for rate limit responses

## License

This project is open source. Feel free to modify and distribute according to the license terms.

## Support

For support, bug reports, or feature requests:
- Check the troubleshooting section above
- Review Google AI Studio documentation for API-related issues
- Ensure you're using a supported browser version

---

**Note**: You'll need a Google Gemini API key to use this extension. The extension will guide you through the setup process on first use.
