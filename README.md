# autofill Chrome Extension

<div align="center">

**AI-Powered SEO Directory Submission Tool**

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/autofill/chrome-extension)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org/)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Development](#-development) • [Architecture](#-architecture)

</div>

---

## 📖 Overview

autofill is a sophisticated Chrome extension that leverages AI to automate website directory submissions, form filling, and SEO optimization tasks. It features intelligent page analysis, network interception, and seamless integration with popular platforms like Twitter/X.

### ✨ Key Features

- 🔐 **OAuth Authentication** - Secure login via autofill API
- ⚡ **Quick Fill** - AI-powered automatic form detection and filling
- 🔍 **Quick Discover** - Analyze web pages for submission opportunities
- 📋 **Batch Submit** - Submit to multiple websites simultaneously
- 📝 **Task Management** - Track and manage automation tasks
- 🌐 **Website Profiles** - Manage website information and templates
- 🎯 **Twitter/X Integration** - Specialized features for social platforms
- 🪝 **Network Interception** - Capture and analyze network requests
- 🤖 **Page Automation** - Advanced browser automation capabilities

---

## 🚀 Installation

### From Chrome Web Store (Recommended)

> Coming soon! The extension will be available on the Chrome Web Store.

### Manual Installation (Development Build)

#### Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn** package manager

#### Build from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/autofill-extension.git
   cd autofill-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in top right)
   - Click **"Load unpacked"** button
   - Select the `dist` folder from the project directory

5. **Verify Installation**
   - You should see "autofill" in your extensions list
   - The extension icon should appear in Chrome's toolbar

---

## 📚 Usage Guide

### First Time Setup

1. **Sign In**
   - Click the autofill extension icon in Chrome's toolbar
   - Click "Sign In with autofill"
   - Authorize the extension to access your account

2. **Explore the Dashboard**
   - **Quick Fill** - Configure auto-fill settings
   - **Quick Discover** - Analyze pages for opportunities
   - **Batch Submit** - Submit to multiple sites
   - **Tasks** - View automation history
   - **Websites** - Manage your website profiles
   - **Settings** - Configure extension preferences

### Quick Fill (⚡ 快速填充)

Automatically fill forms using AI-powered suggestions:

1. Navigate to any webpage with a form
2. Click on any input field
3. A floating AI button will appear
4. Click the button to auto-fill the form
5. Review and submit the filled data

**Settings:**
- Enable/disable auto-detection
- Show/hide floating button
- Configure fill preferences

### Quick Discover (🔍 页面分析)

Analyze web pages for submission opportunities:

1. Open the Side Panel (click extension icon)
2. Navigate to the "Quick Discover" tab
3. Enter a URL to analyze
4. Click "Analyze Page"
5. View discovered forms and submission points

### Batch Submit (📋 批量提交)

Submit to multiple directories at once:

1. Open the "Batch Submit" tab
2. Enter multiple URLs (one per line)
3. Select submission templates
4. Click "Start Batch Submit"
5. Monitor progress in real-time

### Task Management

Track your automation tasks:

- View all submitted tasks
- Check task status (Ready, Running, Completed, Error)
- Retry failed tasks
- View detailed execution logs
- Export task history

---

## 🛠️ Development

### Project Structure

```
autofill-extension/
├── src/
│   ├── background/          # Service Worker (6 modules)
│   ├── content/             # Content Scripts (7 modules)
│   ├── page-controller/     # Page Automation (8 modules)
│   ├── page-hook/           # Network Interception (5 modules)
│   ├── ui/                  # React UI
│   └── shared/              # Shared Code
├── public/                  # Static Assets
├── dist/                    # Build Output
├── docs/                    # Documentation
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Available Scripts

```bash
# Install dependencies
npm install

# Development build with HMR
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Tech Stack

**Core:**
- TypeScript 5.0
- Vite 5
- React 18
- Emotion (CSS-in-JS)

**Chrome Extension APIs:**
- Manifest V3
- Service Workers
- Storage, Tabs, Scripting, Context Menus, Side Panel

---

## 🏗️ Architecture

### System Architecture

```
Chrome Browser
├── Popup UI (React)
├── Side Panel (Dashboard)
├── Background Service Worker
│   ├── Authentication
│   ├── Message Routing
│   └── API Communication
├── Content Script (injected)
│   ├── Form Detection
│   ├── Twitter Logic
│   └── Storage Management
├── Page Controller (injected)
│   ├── DOM Processing
│   ├── Automation Actions
│   └── Element Interaction
└── Page Hook (injected)
    ├── XHR/Fetch Hooking
    └── Network Interception
```

### Key Design Principles

- **Type Safety**: Full TypeScript coverage
- **Modularity**: Separated concerns with focused modules
- **Security**: Origin validation, input sanitization
- **Performance**: 87% bundle size reduction
- **Maintainability**: Clear naming and documentation

---

## 🔧 Configuration

### Build Configuration

- **Path aliases**: `@/`, `@components/`, etc.
- **Manual chunk splitting**: Optimal bundle sizes
- **Terser minification**: Production builds
- **Multi-entry**: popup, sidepanel, options

### TypeScript Configuration

- Strict mode enabled
- React JSX support
- Path mapping for clean imports

---

## 🐛 Troubleshooting

### Common Issues

**Extension won't load**
- Ensure all files are in `dist` folder
- Check Chrome version (requires 88+)
- Enable Developer mode
- Check extensions page for errors

**Login fails**
- Verify internet connection
- Check if autofill.app is accessible
- Ensure CORS permissions
- Check Console for OAuth errors

**Forms not auto-filling**
- Enable "Auto-detect" in settings
- Ensure "Show floating button" is on
- Check Console for detection logs
- Verify form isn't in iframe

**Side panel not opening**
- Click extension icon in toolbar
- Right-click icon → "Open side panel"
- Requires Chrome 114+

### Debug Mode

Enable detailed logging:

1. Open `chrome://extensions/`
2. Find autofill extension
3. Click "Service worker" for DevTools
4. Check Console for logs
5. Filter by tags: `[autofill]`, `[Background]`, `[Content]`

---

## 📊 Performance

### Build Optimization

| Component | Original | Refactored | Reduction |
|-----------|----------|-----------|-----------|
| Background | 14KB | 10.24KB | 27% |
| Page Controller | 92KB | 12.76KB | **86%** |
| Content Script | 474KB | 9.89KB | **98%** |
| React UI | 954KB | 170KB | **82%** |
| **Total** | **1534KB** | **203KB** | **87%** |

---

## 🤝 Contributing

We welcome contributions!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

### Guidelines

- Follow existing code style
- Add TypeScript types
- Write comprehensive comments
- Test before submitting
- Update documentation

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Website**: [https://autofill.app](https://autofill.app)
- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

---

<div align="center">

**Built with ❤️ by the autofill Team**

Version 2.1.0 - Refactored for better maintainability

</div>
