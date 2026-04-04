# 🎥 YouTube Subtitle Translator

A full-stack app that:

* Takes a YouTube link
* Fetches captions automatically
* Translates them into another language
* Displays both original + translated subtitles

---

# ⚙️ Tech Stack

* **Frontend:** React (Vite)
* **Backend:** Spring Boot (Java)
* **Captions:** Python (`youtube-transcript-api`)
* **Translation:** MyMemory API (no setup needed)

---

# 🚀 Setup on a New Laptop

## 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

---

## 2. Install requirements

### 🔹 Install Node.js

Download: https://nodejs.org

Check:

```bash
node -v
npm -v
```

---

### 🔹 Install Java (JDK 17+ recommended)

Check:

```bash
java -version
```

---

### 🔹 Install Maven

Check:

```bash
mvn -v
```

---

### 🔹 Install Python

Download: https://www.python.org

IMPORTANT:
✔️ Check **"Add Python to PATH"**

Check:

```bash
python --version
```

---

## 3. Install Python package

```bash
python -m pip install youtube-transcript-api
```

---

# ▶️ Running the App

You need **2 terminals** open.

---

## 🖥 Terminal 1 — Backend (Spring Boot)

```bash
cd backend
mvn spring-boot:run
```

Runs on:

```txt
http://localhost:8080
```

---

## 💻 Terminal 2 — Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Runs on:

```txt
http://localhost:5173
```

---

# 🌐 Open the app

Go to:

```txt
http://localhost:5173
```

---

# ✅ How to use

1. Paste a YouTube link
2. Choose a language
3. Click **"Get and translate subtitles"**
4. View:

   * 🎬 Video
   * 📝 Original captions
   * 🌍 Translated captions

---

# 🧪 Test video

Use this:

```txt
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

---

# ❗ Common Issues

## 1. Backend 500 error

* Make sure Python package is installed:

```bash
python -m pip install youtube-transcript-api
```

---

## 2. Stuck on "Getting captions..."

* Check backend terminal logs
* Usually translation timeout or API delay

---

## 3. Port already in use

Change port in `vite.config.js` or Spring Boot config

---

## 4. Python not found

Reinstall Python and enable:

```txt
Add to PATH
```

---

# 📁 Project Structure

```bash
backend/
  scripts/
    get_transcript.py
  src/main/java/...

frontend/
  src/components/Home.jsx
  src/App.jsx
  src/main.jsx
```

---

# 🔥 Future Improvements

* Sync subtitles with video playback
* Export `.srt` files
* Add audio translation (text-to-speech)
* Whisper fallback when captions are missing

---

# 👨‍💻 Author

Built for hackathon / learning project 🚀
