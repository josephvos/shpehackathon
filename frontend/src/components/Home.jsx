import React, { useMemo, useState } from 'react'
import axios from 'axios'
import '../index.css'



function getYouTubeId(url) {
  try {
    if (!url) return ''
    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1].split('?')[0]
    }
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v') || ''
    }
    return ''
  } catch {
    return ''
  }
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [lang, setLang] = useState('es')
  const [status, setStatus] = useState('')
  const [subtitles, setSubtitles] = useState([])
  const [originalSubtitles, setOriginalSubtitles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [cancelTokenSource, setCancelTokenSource] = useState(null)

  const videoId = useMemo(() => getYouTubeId(url), [url])
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : ''

  const cancelTranslation = () => {
    if (cancelTokenSource) {
      cancelTokenSource.cancel('Translation cancelled by user')
    }
    setIsLoading(false)
    setProgress(0)
    setProgressText('')
    setStatus('❌ Translation cancelled')
    setCancelTokenSource(null)
  }

  const handleTranslate = async () => {
    if (!url) {
      setStatus('Paste a YouTube link first.')
      return
    }

    setIsLoading(true)
    setProgress(0)
    setProgressText('')
    setStatus('🔄 Fetching captions and translating with LibreTranslate...')
    setSubtitles([])
    setOriginalSubtitles([])

    // Create cancel token
    const cancelToken = axios.CancelToken.source()
    setCancelTokenSource(cancelToken)

    try {
      // Start the translation request
      const translationPromise = axios.post(
        '/api/subtitles/translate',
        {
          videoUrl: url,
          targetLang: lang
        },
        {
          timeout: 300000, // 5 minutes for very long videos
          cancelToken: cancelToken.token,
          onUploadProgress: (progressEvent) => {
            // This won't give us translation progress, but shows request is being sent
            if (progressEvent.lengthComputable && progress === 0) {
              setProgress(5)
              setProgressText('Request sent, starting translation...')
            }
          }
        }
      )

      // Simulate progress updates while waiting (since we don't have real-time progress from backend yet)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 85) {
            const increment = Math.random() * 8 + 1 // Random increment between 1-9%
            const newProgress = Math.min(prev + increment, 85)
            
            // Update progress text based on current progress
            if (newProgress < 15) {
              setProgressText('Analyzing YouTube URL...')
            } else if (newProgress < 25) {
              setProgressText('Fetching video transcript...')
            } else if (newProgress < 35) {
              setProgressText('Processing caption data...')
            } else if (newProgress < 50) {
              setProgressText('Starting LibreTranslate...')
            } else if (newProgress < 70) {
              setProgressText('Translating captions...')
            } else if (newProgress < 85) {
              setProgressText('Finalizing translations...')
            } else {
              setProgressText('Almost done...')
            }
            
            return newProgress
          }
          return prev
        })
      }, 600) // Update every 600ms for smoother animation

      const response = await translationPromise
      
      // Clear interval and complete progress
      clearInterval(progressInterval)
      setProgress(100)
      setProgressText('Translation complete!')

      setOriginalSubtitles(response.data.originalSubtitles || [])
      setSubtitles(response.data.translatedSubtitles || [])
      
      setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
        setProgressText('')
        setCancelTokenSource(null)
        setStatus(`✅ Translation complete! Translated ${response.data.translatedSubtitles?.length || 0} lines with LibreTranslate.`)
      }, 1000) // Show complete state for 1 second
      
    } catch (err) {
      if (axios.isCancel(err)) {
        // Don't update status if already cancelled
        return
      }
      setIsLoading(false)
      setProgress(0)
      setProgressText('')
      setCancelTokenSource(null)
      setStatus(`❌ ${err.message || 'Something went wrong'}`)
    }
  }

  return (
    <div className="page">
      <div className="hero">
        <h1>YouTube Subtitle Translator</h1>
        <p>Paste a YouTube link, fetch real captions, and translate them with LibreTranslate into 49+ languages.</p>
      </div>

      <div className="card">
        <label>Video URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />

        <label>Target language</label>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          {/* Popular Latino/Spanish languages first */}
          <option value="es">🇪🇸 Spanish (Español)</option>
          <option value="pt-BR">🇧🇷 Portuguese (Brazil)</option>
          <option value="pt">🇵🇹 Portuguese</option>
          <option value="ca">🏴󠁥󠁳󠁣󠁴󠁿 Catalan</option>
          <option value="gl">🏴󠁥󠁳󠁧󠁡󠁿 Galician</option>
          <option value="eu">🏴󠁥󠁳󠁰󠁶󠁿 Basque (Euskera)</option>
          
          {/* Separator */}
          <option disabled>──────────</option>
          
          {/* Popular European languages */}
          <option value="fr">🇫🇷 French (Français)</option>
          <option value="de">🇩🇪 German (Deutsch)</option>
          <option value="it">🇮🇹 Italian (Italiano)</option>
          <option value="en">🇺🇸 English</option>
          <option value="ru">🇷🇺 Russian (Русский)</option>
          <option value="nl">🇳🇱 Dutch (Nederlands)</option>
          <option value="sv">🇸🇪 Swedish (Svenska)</option>
          <option value="da">🇩🇰 Danish (Dansk)</option>
          <option value="nb">🇳🇴 Norwegian (Norsk)</option>
          <option value="fi">🇫🇮 Finnish (Suomi)</option>
          <option value="pl">🇵🇱 Polish (Polski)</option>
          <option value="cs">🇨🇿 Czech (Čeština)</option>
          <option value="sk">🇸🇰 Slovak (Slovenčina)</option>
          <option value="sl">🇸🇮 Slovenian (Slovenščina)</option>
          <option value="hu">🇭🇺 Hungarian (Magyar)</option>
          <option value="ro">🇷🇴 Romanian (Română)</option>
          <option value="bg">🇧🇬 Bulgarian (Български)</option>
          <option value="uk">🇺🇦 Ukrainian (Українська)</option>
          <option value="el">🇬🇷 Greek (Ελληνικά)</option>
          <option value="ga">🇮🇪 Irish (Gaeilge)</option>
          <option value="et">🇪🇪 Estonian (Eesti)</option>
          <option value="lv">🇱🇻 Latvian (Latviešu)</option>
          <option value="lt">🇱🇹 Lithuanian (Lietuvių)</option>
          
          {/* Asian languages */}
          <option disabled>──────────</option>
          <option value="zh-Hans">🇨🇳 Chinese (简体中文)</option>
          <option value="zh-Hant">🇹🇼 Chinese Traditional (繁體中文)</option>
          <option value="ja">🇯🇵 Japanese (日本語)</option>
          <option value="ko">🇰🇷 Korean (한국어)</option>
          <option value="hi">🇮🇳 Hindi (हिन्दी)</option>
          <option value="th">🇹🇭 Thai (ไทย)</option>
          <option value="vi">🇻🇳 Vietnamese (Tiếng Việt)</option>
          <option value="id">🇮🇩 Indonesian (Bahasa Indonesia)</option>
          <option value="ms">🇲🇾 Malay (Bahasa Melayu)</option>
          <option value="tl">🇵🇭 Tagalog (Filipino)</option>
          <option value="bn">🇧🇩 Bengali (বাংলা)</option>
          <option value="ur">🇵🇰 Urdu (اردو)</option>
          <option value="fa">🇮🇷 Persian (فارسی)</option>
          
          {/* Middle Eastern & African languages */}
          <option disabled>──────────</option>
          <option value="ar">🇸🇦 Arabic (العربية)</option>
          <option value="he">🇮🇱 Hebrew (עברית)</option>
          <option value="tr">🇹🇷 Turkish (Türkçe)</option>
          <option value="az">🇦🇿 Azerbaijani (Azərbaycan)</option>
          <option value="ky">🇰🇬 Kyrgyz (Кыргызча)</option>
          
          {/* Other languages */}
          <option disabled>──────────</option>
          <option value="eo">🌍 Esperanto</option>
          <option value="sq">🇦🇱 Albanian (Shqip)</option>
        </select>

        <button onClick={handleTranslate} disabled={isLoading}>
          {isLoading ? '⏳ Translating...' : 'Get and translate subtitles'}
        </button>
        
        {/* Cancel Button */}
        {isLoading && (
          <button onClick={cancelTranslation} className="cancelButton">
            ❌ Cancel Translation
          </button>
        )}
        
        {/* Progress Bar */}
        {isLoading && (
          <div className="progressContainer">
            <div className="progressBar">
              <div 
                className="progressFill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="progressText">
              {progressText && (
                <span className="progressLabel">{progressText}</span>
              )}
              <span className="progressPercent">{Math.round(progress)}%</span>
            </div>
          </div>
        )}
        
        <p className="status">{status}</p>
      </div>

      {embedUrl && (
        <div className="videoCard">
          <iframe
            width="100%"
            height="420"
            src={embedUrl}
            title="YouTube player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {(originalSubtitles.length > 0 || subtitles.length > 0) && (
        <div className="subtitlesGrid">
          <div className="subCard">
            <h2>Original captions</h2>
            <div className="subList">
              {originalSubtitles.map((line, index) => (
                <div className="subLine" key={`o-${index}`}>
                  <span className="time">{line.start.toFixed(1)}s</span>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="subCard">
            <h2>Translated captions</h2>
            <div className="subList">
              {subtitles.map((line, index) => (
                <div className="subLine" key={`t-${index}`}>
                  <span className="time">{line.start.toFixed(1)}s</span>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}