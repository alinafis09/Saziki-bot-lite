<img src="./menu.png" width="560" height="550" alt="Saziki Bot Logo">
           
           🤖 *Saziki Bot - Advanced WhatsApp Bot*
           

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/Baileys-6.7.7-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Railway-ready-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-GPL%203.0-orange?style=for-the-badge" />
</p>

<p align="center">
  <b>A powerful, modular, and production-ready WhatsApp bot built with Node.js and Baileys library</b>
</p>

---

📋 Table of Contents

· ✨ Features
· 📦 Installation
· ⚙️ Configuration
· 🚀 Deployment
· 📁 Project Structure
· 🎮 Available Commands
· 🔧 Customization
· 🧪 Testing
· 📊 Performance
· 🛡️ Security
· ❓ Troubleshooting
· 📝 License
· 👥 Contributors
· 📞 Support

---

✨ Features

Core Features

· ✅ Multi-Device Support - Full WhatsApp multi-device compatibility
· ✅ Auto Pairing Code - Automatic login without QR code scanning
· ✅ Plugin System - Easy to add custom commands
· ✅ Modular Architecture - Clean and maintainable code structure
· ✅ Database Support - Lightweight JSON database with lowdb
· ✅ Session Management - Multi-file auth state for reliability

Technical Features

· ✅ ES Modules - Modern JavaScript with import/export
· ✅ Node.js 18+ - Optimized for latest Node.js versions
· ✅ Railway Ready - Deploy with one click on Railway
· ✅ Auto Reconnect - Handles connection drops gracefully
· ✅ Error Recovery - Self-healing on crashes
· ✅ Memory Optimized - Efficient cache management
· ✅ Clean Logs - Filtered console output

Bot Features

· ✅ Interactive Menu - Beautiful categorized menu system
· ✅ Downloader Commands - Download from YouTube, TikTok, Instagram
· ✅ AI Commands - Integrated with Gemini AI
· ✅ Sticker Maker - Create stickers from images/videos
· ✅ Text Stickers - Multi-color animated text stickers
· ✅ Playlist Manager - Create and manage playlists
· ✅ Premium System - User subscription management
· ✅ Admin Tools - Group management commands

---

📦 Installation

Prerequisites

· Node.js 18 or higher
· npm or yarn
· Git

Quick Install

```bash
# Clone the repository
git clone https://github.com/alinafis09/Saziki-bot.git
cd Saziki-bot

# Install dependencies
npm install

# Copy configuration
cp config.example.js config.js

# Edit configuration with your details
nano config.js

# Start the bot
npm start
```

Docker Installation

```bash
# Build the Docker image
docker build -t saziki-bot .

# Run the container
docker run -d --name saziki-bot -v $(pwd)/data:/app/data saziki-bot
```

PM2 Installation (Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start index.js --name saziki-bot

# Save PM2 configuration
pm2 save
pm2 startup
```

---
🚀 Deployment

Deploy on Railway (Recommended)

https://railway.app/button.svg

1. Click the "Deploy on Railway" button
2. Connect your GitHub account
3. Add your bot number in environment variables
4. Deploy!

Deploy on Heroku

```bash
# Create Heroku app
heroku create saziki-bot

# Set environment variables
heroku config:set BOT_NUMBER=212624052666

# Deploy
git push heroku main
```

Deploy on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone repository
git clone https://github.com/alinafis09/Saziki-bot.git
cd Saziki-bot

# Install dependencies
npm install

# Use PM2 for process management
npm install -g pm2
pm2 start index.js --name saziki-bot
pm2 save
pm2 startup
```

---

📁 Project Structure

```
📁 saziki-bot/
├── 📄 index.js                 # Entry point
├── 📄 main.js                  # Core bot logic
├── 📄 config.js                # Configuration
├── 📄 package.json             # Dependencies
├── 📁 src/
│   ├── 📁 libraries/
│   │   ├── 📄 simple.js        # Socket helpers
│   │   ├── 📄 store.js         # Message store
│   │   ├── 📄 print.js         # Logger
│   │   ├── 📄 LidResolver.js   # LID resolution
│   │   └── 📄 subBotManager.js # Multi-bot manager
│   └── 📁 tmp/                 # Temporary files
├── 📁 plugins/
│   ├── 📄 menu.js              # Menu system
│   ├── 📄 ping.js              # Ping command
│   ├── 📄 ai.js                # AI commands
│   ├── 📄 sticker.js           # Sticker maker
│   ├── 📄 textsticker.js       # Text stickers
│   ├── 📄 playlist.js          # Playlist manager
│   ├── 📄 premium.js           # Premium system
│   └── 📄 download-*.js        # Downloaders
├── 📁 lib/
│   ├── 📄 settings.js          # Bot settings
│   └── 📄 ui.js                # UI helpers
├── 📁 session/                  # Auth sessions
└── 📁 logs/                     # Log files
```

---

🎮 Available Commands

📋 General Commands

Command Description Usage
.menu Show main menu .menu
.menu ai Show AI commands .menu ai
.menu download Show downloader commands .menu download
.ping Check bot latency .ping
.uptime Show bot uptime .uptime
.info Bot information .info

🤖 AI Commands

Command Description Usage
.ai <text> Chat with AI .ai What is JavaScript?
.ask <text> Ask AI .ask How to code?
.imagine <text> Generate image .imagine cat in space

📥 Downloader Commands

Command Description Usage
.tiktok <url> Download TikTok video .tiktok https://tiktok.com/...
.playlist <song> Search YouTube .playlist never gonna give you up
.playaudio <number> Download audio .playaudio 1

🎨 Sticker Commands

Command Description Usage
.sticker Image to sticker .sticker (reply to image)
.sgif Video to sticker .sgif (reply to video)
.textsticker <text> Text sticker .ts Hello World
.rainbow <text> Rainbow text .rainbow Welcome
.bounce <text> Animated sticker .bounce Hello

🎵 Playlist Commands

Command Description Usage
.playlist create <name> Create playlist .pl create mylist
.playlist add <name> <url> Add song .pl add mylist https://youtu.be/...
.playlist view <name> View playlist .pl view mylist
.playlist play <name> <num> Play song .pl play mylist 1

👑 Owner Commands

Command Description Usage
.premium add @user Add premium .premium add @user
.premium list List premium users .premium list
.broadcast <text> Broadcast message .broadcast Hello all
.restart Restart bot .restart

---

🧪 Testing

Run Tests

```bash
# Run all tests
npm test

# Run specific test
npm test -- --grep "premium"
```

Manual Testing

```bash
# Start in development mode with auto-reload
npm run dev

# Check logs
tail -f logs/bot.log
```

Performance Testing

```bash
# Monitor resource usage
pm2 monit

# Check logs
pm2 logs saziki-bot
```

---

📊 Performance

Memory Usage

· Idle: ~50 MB
· Active: ~100-150 MB
· Peak: ~250 MB

Response Time

· Command processing: <100ms
· Download operations: 2-10s
· AI responses: 3-5s

Scalability

· Supports up to 1000 groups
· Handles 100+ messages/second
· 10 concurrent downloads

---

🛡️ Security

Best Practices

1. Environment Variables - Never hardcode credentials
2. Session Protection - Multi-file auth state
3. Rate Limiting - Cooldown per command
4. Input Validation - Sanitize user input
5. Error Handling - Graceful error recovery

Security Checklist

· Change default phone number
· Use environment variables
· Enable HTTPS for web server
· Regular dependency updates
· Monitor for suspicious activity

---

❓ Troubleshooting

Common Issues

Bot won't start

```bash
# Check Node.js version
node --version  # Must be 18+

# Clear cache
rm -rf node_modules package-lock.json
npm install
```

Pairing code fails

```javascript
// Check phone number format
console.log('Phone:', phoneNumber); // Must be numbers only

// Verify credentials
rm -rf SazikiSession
npm start
```

Memory issues

```javascript
// Increase Node.js memory
node --max-old-space-size=512 index.js
```

Connection errors

```javascript
// Check network
ping web.whatsapp.com

// Verify proxy settings
// Disable proxy if used
```

Debug Mode

```bash
# Enable debug logs
LOG_LEVEL=debug npm start

# Trace Baileys
DEBUG=baileys:* npm start
```

---

📝 License

This project is licensed under the GNU General Public License v3.0 - see the LICENSE file for details.

```
Copyright (C) 2024 Ali Nafis

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```

---

👥 Contributors

Core Team

· Ali Nafis - Lead Developer
  · GitHub
  · Instagram

Contributors

· Mareyo - UI/UX Design
· Community - Bug reports and suggestions

How to Contribute

1. Fork the repository
2. Create your feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m 'Add some AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

---

📞 Support

Get Help

· 📧 Email: alinafis123a@gmail.com
· 💬 WhatsApp: wa.me/212719558797
· 🌐 Website: saziki-bot.xyz
· 📢 Telegram: t.me/saziki_updates
· 🐦 Twitter: @saziki_bot

Report Issues

Found a bug? Open an issue

Feature Requests

Have an idea? Suggest a feature

---

💖 Support the Project

· ⭐ Star the repository
· 🍴 Fork and contribute
· 📢 Share with friends
· 💰 Donate to support development

Donations

· Bitcoin: bc1q...
· Ethereum: 0x...
· PayPal: paypal.me/alinafis

---

<p align="center">
  Made with ❤️ by Ali Nafis
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/alinafis09/Saziki-bot?style=social" />
  <img src="https://img.shields.io/github/forks/alinafis09/Saziki-bot?style=social" />
  <img src="https://img.shields.io/github/watchers/alinafis09/Saziki-bot?style=social" />
</p>
