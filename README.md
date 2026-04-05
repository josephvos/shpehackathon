# 🎥 YouTube Subtitle Translator with LibreTranslate

A full-stack application that fetches real YouTube transcripts and translates them using LibreTranslate for high-quality, offline translations into 49+ languages.

## ✨ Features

* 📹 **Real YouTube transcript fetching** - No more demo data
* 🌍 **49+ languages supported** - Powered by LibreTranslate
* 🚀 **Real-time progress bar** - See translation progress with ETA
* ❌ **Cancel translation** - Stop long translations anytime  
* 🏠 **Offline translation** - No API keys or internet dependency
* 🎯 **Complete transcript** - Translates entire video, not just samples
* 🇪🇸 **Latino languages prioritized** - Spanish, Portuguese, Catalan at the top

---

# ⚙️ Tech Stack

* **Frontend:** React + Vite (Progress bars, 49 languages, real-time updates)
* **Backend:** Spring Boot (Java) with enhanced progress tracking
* **Transcripts:** Python `youtube-transcript-api` for real YouTube captions
* **Translation:** **LibreTranslate** (offline, high-quality, 49+ languages)

---

# 🚀 Complete Setup Instructions

## Prerequisites

Before starting, ensure you have:
- **Node.js 18+** (for frontend)
- **Java 17+** (for Spring Boot backend) 
- **Python 3.8+** (for transcript fetching)
- **Maven** (for Java build)

---

## 1️⃣ Clone and Setup Project

```bash
# Clone the repository
git clone <your-repo-url>
cd shpehackathon

# Make scripts executable
chmod +x restart_all.sh stop_all.sh status.sh demo.sh
```

---

## 2️⃣ Install System Dependencies

### 🔹 Node.js & npm
```bash
# Check if installed
node -v && npm -v

# If not installed, download from: https://nodejs.org
```

### 🔹 Java (JDK 17+)
```bash
# Check if installed
java -version

# If not installed:
# macOS: brew install openjdk@17
# Windows: Download from Oracle or OpenJDK
# Linux: sudo apt install openjdk-17-jdk
```

### 🔹 Maven
```bash
# Check if installed
mvn -v

# If not installed:
# macOS: brew install maven
# Windows: Download from https://maven.apache.org
# Linux: sudo apt install maven
```

### 🔹 Python 3.8+
```bash
# Check if installed
python --version
# or
python3 --version

# If not installed, download from: https://python.org
# ⚠️ IMPORTANT: Check "Add Python to PATH" during installation
```

---

## 3️⃣ Install Python Dependencies

```bash
# Install YouTube transcript API
pip install youtube-transcript-api

# Or if using python3 specifically:
pip3 install youtube-transcript-api
```

---

## 4️⃣ Install LibreTranslate

LibreTranslate is the core translation engine that runs locally.

```bash
# Install LibreTranslate
pip install libretranslate

# Or with python3:
pip3 install libretranslate
```

**Note:** First startup will download language models (~2-4GB total), so ensure good internet connection.

---

## 5️⃣ Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install all npm dependencies
npm install

# Return to project root
cd ..
```

---

## 6️⃣ Easy Startup (Recommended)

Use our automated startup script:

```bash
# Start all services (LibreTranslate + Spring Boot + Vite)
./restart_all.sh
```

This script will:
- 🔄 Kill any existing processes on ports 5000, 8080, 5173
- 🚀 Start LibreTranslate server (http://127.0.0.1:5000)
- 🚀 Start Spring Boot backend (http://localhost:8080) 
- 🚀 Start Vite frontend (http://localhost:5173)
- ✅ Verify all services are running
- 🧪 Test LibreTranslate with sample German translation

**Wait for:** `🎉 YouTube Video Translator is ready to use!`

---

## 7️⃣ Manual Startup (Alternative)

If you prefer to start services manually:

### Terminal 1 - LibreTranslate
```bash
# Start LibreTranslate server
libretranslate --host 127.0.0.1 --port 5000

OR

python -m libretranslate --host 127.0.0.1 --port 5000

# Wait for: "Loaded support for 49 languages"
```

### Terminal 2 - Backend 
```bash
# Start Spring Boot server
cd backend
mvn spring-boot:run

# Wait for: "Started VideoTranslatorApplication"
```

### Terminal 3 - Frontend
```bash
# Start Vite development server  
cd frontend
npm run dev

# Wait for: "Local: http://localhost:5173"
```

---

# 🌐 Using the Application

## 1. Open Your Browser
Navigate to: **http://localhost:5173**

## 2. Enter YouTube URL
Paste any YouTube video URL:
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`

## 3. Select Target Language
Choose from 49+ languages including:
- 🇪🇸 **Spanish (Español)**
- 🇧🇷 **Portuguese (Brazil)** 
- 🇩🇪 **German (Deutsch)**
- 🇫🇷 **French (Français)**
- 🇷🇺 **Russian (Русский)**
- 🇨🇳 **Chinese (中文)**
- 🇯🇵 **Japanese (日本語)**
- And 40+ more...

## 4. Start Translation
Click **"Get and translate subtitles"**

## 5. Watch Progress
- 📊 **Real-time progress bar** with percentage
- 📝 **Progress stages:** "Fetching transcript..." → "Translating..." → "Complete!"
- ⏱️ **Estimated time remaining**
- ❌ **Cancel anytime** if needed

## 6. View Results
- 🎬 **Embedded YouTube video**
- 📄 **Original captions** (left column)
- 🌍 **Translated captions** (right column) 
- ⏰ **Timestamps** for each caption line

---

# 🛠️ Management Commands

```bash
# Start all services
./restart_all.sh

# Stop all services  
./stop_all.sh

# Check service status
./status.sh

# Run demo with test URLs
./demo.sh
```

---

# 🔧 Service URLs

When running, these services will be available:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8080
- **LibreTranslate:** http://127.0.0.1:5000

---

# 🧪 Test Videos

Try these YouTube URLs for testing:
- **Short video:** `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- **Educational:** `https://www.youtube.com/watch?v=jNQXAC9IVRw`

---

# ❗ Troubleshooting

## LibreTranslate Issues

**Problem:** LibreTranslate fails to start
**Solution:**
```bash
# Reinstall LibreTranslate
pip uninstall libretranslate
pip install libretranslate

# Or try with specific Python version
python3 -m pip install libretranslate
```

**Problem:** "Translation failed" errors
**Solution:**
```bash
# Check if LibreTranslate is running
curl http://127.0.0.1:5000/languages

# If not responding, restart it
pkill -f libretranslate
libretranslate --host 127.0.0.1 --port 5000
```

## Backend Issues

**Problem:** Spring Boot won't start (port 8080 busy)
**Solution:**
```bash
# Kill process using port 8080
lsof -ti :8080 | xargs kill -9

# Or use our restart script
./restart_all.sh
```

**Problem:** "Python script failed" errors
**Solution:**
```bash
# Test Python script directly
cd scripts
python get_transcript.py dQw4w9WgXcQ

# Reinstall transcript API
pip install --upgrade youtube-transcript-api
```

## Frontend Issues  

**Problem:** Vite server won't start (port 5173 busy)
**Solution:**
```bash
# Kill Vite processes
pkill -f vite

# Or change port in vite.config.js:
export default defineConfig({
  server: { port: 5174 }  // Use different port
})
```

## General Issues

**Problem:** "No captions available"  
**Solution:** Try a different YouTube video. Some videos don't have auto-generated captions.

**Problem:** Long videos timeout
**Solution:** The system handles up to 5 minutes timeout. For very long videos, consider using shorter clips.

---

# 📊 Performance Notes

- **LibreTranslate startup:** 30-60 seconds (first time downloads models)
- **Translation speed:** ~2-5 lines per second depending on text length
- **Memory usage:** ~2-4GB for LibreTranslate language models
- **Supported video length:** Unlimited (timeout: 5 minutes for translation)

---

# 🔥 Recent Improvements

- ✅ **LibreTranslate integration** (replaced MyMemory API)
- ✅ **Real-time progress tracking** with cancel functionality
- ✅ **Complete transcript translation** (removed 15-line limit)
- ✅ **49+ language support** with native names and flags
- ✅ **Automated startup/shutdown** scripts
- ✅ **Enhanced error handling** and user feedback
- ✅ **Responsive progress UI** with smooth animations

---

# 🚧 Future Enhancements

- 🔄 **WebSocket progress** for real-time backend progress updates
- 📁 **Export functionality** (.srt, .vtt file downloads)
- 🎵 **Audio translation** (text-to-speech integration)
- 🤖 **Whisper integration** for videos without captions
- 🎬 **Video player sync** with translated captions
- 🌙 **Batch processing** for multiple videos

---

# 👥 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)  
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 🙏 Acknowledgments

- **LibreTranslate** - Open source translation engine
- **youtube-transcript-api** - YouTube caption extraction
- **Spring Boot** - Backend framework
- **React + Vite** - Frontend framework

---

**Built with ❤️ for seamless YouTube video translation**
