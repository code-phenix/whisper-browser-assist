# 🎤 Whisper Browser Assistant

A voice-controlled browser assistant that uses speech recognition to control web pages. Built with Web Speech API and Whisper.js for real-time voice command processing.

## 🚀 Features

- **Real-time Speech Recognition**: See words appear as you speak
- **Voice Commands**: Control scrolling, clicking, and page reading
- **Live Debug Logging**: Comprehensive debugging with timestamps
- **Responsive UI**: Beautiful, modern interface
- **Cross-browser Support**: Works in all modern browsers

## 📁 Project Structure

```
whisper-browser-assist/
├── public/                    # Static files served as-is
│   └── index.html            # Main HTML file
├── src/                       # All source code
│   ├── js/
│   │   ├── main.js           # Main application logic
│   │   └── whisper.cpp.js    # Whisper module implementation
│   ├── css/
│   │   └── style.css         # Styles for the application
│   └── models/               # Whisper model files
├── server.py                 # Python HTTP server script
└── README.md                 # This file
```

## 🛠️ Setup & Installation

### Prerequisites
- Python 3.x
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Microphone access

### Quick Start

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd whisper-browser-assist
   ```

2. **Start the server**
   ```bash
   python server.py
   ```

3. **Open your browser**
   Navigate to: `http://localhost:8000/public/`

4. **Grant microphone permissions** when prompted

## 🎯 Voice Commands

| Command | Action |
|---------|--------|
| `"scroll down"` | Scroll down the page |
| `"scroll up"` | Scroll up the page |
| `"click [text]"` | Click a button with matching text |
| `"read page"` | Read page content aloud |
| `"start listening"` | Start voice recognition |
| `"stop listening"` | Stop voice recognition |

## 🔧 Development

### Project Structure Benefits
- **Separation of Concerns**: HTML, CSS, and JS are properly separated
- **Scalable**: Easy to add new features and components
- **Maintainable**: Clear organization makes debugging easier
- **Professional**: Industry-standard project structure

### Adding New Features
1. **New JavaScript**: Add files to `src/js/`
2. **New Styles**: Add files to `src/css/`
3. **New Models**: Add files to `src/models/`
4. **Update HTML**: Reference new files in `public/index.html`

### Debugging
- **Console Logs**: Open browser console (F12) for detailed logs
- **Live Debug Panel**: Real-time logs in the voice control panel
- **Timestamps**: All logs include timestamps for tracking

## 🌐 Browser Compatibility

- ✅ Chrome/Chromium (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ❌ Internet Explorer (Not supported)

## 🔒 Privacy & Security

- **Local Processing**: All speech recognition happens in your browser
- **No Server Storage**: Audio data never leaves your computer
- **Open Source**: Transparent code for security review

## 🐛 Troubleshooting

### Common Issues

1. **"Microphone access denied"**
   - Check browser permissions
   - Ensure microphone is not being used by other applications

2. **"Speech recognition not working"**
   - Ensure you're using a supported browser
   - Check internet connection (for some browsers)

3. **"Server won't start"**
   - Check if port 8000 is already in use
   - Try a different port in `server.py`

### Debug Mode
- Open browser console (F12)
- Look for logs with timestamps
- Check the debug panel in the voice controls

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Review the browser console for error messages
3. Open an issue on the repository

---

**Happy Voice Controlling! 🎤✨** 