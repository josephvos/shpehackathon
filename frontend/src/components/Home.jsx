import React, { useEffect, useMemo, useRef, useState } from 'react'
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
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/embed/')[1]?.split('?')[0] || ''
      }
      return parsed.searchParams.get('v') || ''
    }
    return ''
  } catch {
    return ''
  }
}

function getSpeechLang(appLang) {
  const map = {
    es: 'es-ES',
    en: 'en-US',
    fr: 'fr-FR',
    de: 'de-DE',
    it: 'it-IT',
    pt: 'pt-PT',
    'pt-BR': 'pt-BR',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
    ru: 'ru-RU',
    ar: 'ar-SA',
    hi: 'hi-IN'
  }
  return map[appLang] || 'es-ES'
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
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState(-1)
  const [dubEnabled, setDubEnabled] = useState(true)

  const playerRef = useRef(null)
  const playerContainerRef = useRef(null)
  const playerReadyRef = useRef(false)
  const syncIntervalRef = useRef(null)
  const currentSubtitleIndexRef = useRef(-1)
  const lastVideoTimeRef = useRef(0)
  const isSeekingRef = useRef(false)
  const voicesReadyRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const currentUtteranceRef = useRef(null)
  const lastSpokenTextRef = useRef('')

  const videoId = useMemo(() => getYouTubeId(url), [url])

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  const speakText = (text) => {
    if (!dubEnabled || !text || !('speechSynthesis' in window)) return

    stopSpeech()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = getSpeechLang(lang)
    utterance.rate = 1.05
    utterance.pitch = 1
    utterance.volume = 1

    const voices = window.speechSynthesis.getVoices()
    const matchingVoice =
      voices.find((v) => v.lang?.toLowerCase() === utterance.lang.toLowerCase()) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(lang.toLowerCase())) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith('es'))

    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    window.speechSynthesis.speak(utterance)
  }

  const findSubtitleIndexAtTime = (timeSeconds) => {
    return subtitles.findIndex((line) => {
      const start = Number(line.start || 0)
      const end = start + Number(line.duration || 0)
      return timeSeconds >= start && timeSeconds < end
    })
  }

  const syncDubToVideo = () => {
    const player = playerRef.current
    if (!player || !playerReadyRef.current || !window.YT) return

    const state = player.getPlayerState?.()
    if (state !== window.YT.PlayerState.PLAYING) return

    const currentTime = player.getCurrentTime?.() || 0
    const lastTime = lastVideoTimeRef.current
    const jumped = Math.abs(currentTime - lastTime) > 1.2

    if (jumped) {
      isSeekingRef.current = true
      stopSpeech()
      currentSubtitleIndexRef.current = -1
      setActiveSubtitleIndex(-1)
    }

    const subtitleIndex = findSubtitleIndexAtTime(currentTime)

    if (subtitleIndex !== currentSubtitleIndexRef.current) {
      currentSubtitleIndexRef.current = subtitleIndex
      setActiveSubtitleIndex(subtitleIndex)
      stopSpeech()

      if (subtitleIndex >= 0) {
        const line = subtitles[subtitleIndex]
        speakText(line.text)
      }
    }

    lastVideoTimeRef.current = currentTime
    isSeekingRef.current = false
  }

  const startSyncLoop = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
    }

    syncIntervalRef.current = setInterval(() => {
      syncDubToVideo()
    }, 150)
  }

  const destroyPlayer = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    stopSpeech()
    currentSubtitleIndexRef.current = -1
    setActiveSubtitleIndex(-1)

    if (playerRef.current?.destroy) {
      playerRef.current.destroy()
    }

    playerRef.current = null
    playerReadyRef.current = false
  }

  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        createPlayer()
        return
      }

      const existingScript = document.getElementById('youtube-iframe-api')
      if (!existingScript) {
        const tag = document.createElement('script')
        tag.id = 'youtube-iframe-api'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(tag)
      }

      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous()
        createPlayer()
      }
    }

    const createPlayer = () => {
      if (!videoId || !playerContainerRef.current || !(window.YT && window.YT.Player)) return

      destroyPlayer()

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId,
        width: '100%',
        height: '420',
        playerVars: {
          autoplay: 0,
          playsinline: 1,
          rel: 0
        },
        events: {
          onReady: (event) => {
            playerReadyRef.current = true
            event.target.mute()
            startSyncLoop()
          },
          onStateChange: (event) => {
            const state = event.data

            if (state === window.YT.PlayerState.PLAYING) {
              syncDubToVideo()
            }

            if (
              state === window.YT.PlayerState.PAUSED ||
              state === window.YT.PlayerState.BUFFERING ||
              state === window.YT.PlayerState.ENDED
            ) {
              stopSpeech()
            }

            if (state === window.YT.PlayerState.ENDED) {
              currentSubtitleIndexRef.current = -1
              setActiveSubtitleIndex(-1)
            }
          }
        }
      })
    }

    if (videoId) {
      loadYouTubeAPI()
    } else {
      destroyPlayer()
    }

    return () => {
      // keep player during rerenders, only hard cleanup on unmount handled below
    }
  }, [videoId])

  useEffect(() => {
    return () => {
      destroyPlayer()
    }
  }, [])

  useEffect(() => {
    stopSpeech()
    currentSubtitleIndexRef.current = -1
    setActiveSubtitleIndex(-1)
  }, [lang, dubEnabled, subtitles])

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
    setProgressText('Starting translation job...')
    setStatus('🔄 Starting backend translation...')
    setSubtitles([])
    setOriginalSubtitles([])

    let pollInterval = null

    try {
      const startRes = await axios.post('/api/subtitles/translate/start', {
        videoUrl: url,
        targetLang: lang
      })

      const jobId = startRes.data.jobId

      setStatus('🔄 Translation started')
      setProgress(2)
      setProgressText('Job created, waiting for backend progress...')

      pollInterval = setInterval(async () => {
        try {
          const progressRes = await axios.get(`/api/subtitles/translate/progress/${jobId}`)
          const data = progressRes.data

          setProgress(data.progress || 0)
          setProgressText(data.message || '')

          if (data.done) {
            clearInterval(pollInterval)

            if (data.error) {
              setIsLoading(false)
              setStatus(`❌ ${data.errorMessage || 'Translation failed'}`)
              setProgress(0)
              setProgressText('')
              return
            }

            setOriginalSubtitles(data.result?.originalSubtitles || [])
            setSubtitles(data.result?.translatedSubtitles || [])
            setStatus(
              `✅ Translation complete! Translated ${data.result?.translatedSubtitles?.length || 0} lines.`
            )

            setTimeout(() => {
              setIsLoading(false)
              setProgress(0)
              setProgressText('')
            }, 1000)
          }
        } catch (pollErr) {
          clearInterval(pollInterval)
          setIsLoading(false)
          setProgress(0)
          setProgressText('')
          setStatus(`❌ Failed while checking progress: ${pollErr.message}`)
        }
      }, 1000)
    } catch (err) {
      if (pollInterval) clearInterval(pollInterval)
      setIsLoading(false)
      setProgress(0)
      setProgressText('')
      setStatus(`❌ ${err.message || 'Something went wrong'}`)
    }
  }

  const jumpToSubtitle = (startTime) => {
    const player = playerRef.current
    if (!player || !playerReadyRef.current) return

    stopSpeech()
    player.seekTo(startTime, true)
    player.playVideo()
  }

  const speakCurrentSubtitle = () => {
    const player = playerRef.current
    if (!player || !playerReadyRef.current) return

    const currentTime = player.getCurrentTime?.() || 0
    const subtitleIndex = findSubtitleIndexAtTime(currentTime)

    currentSubtitleIndexRef.current = subtitleIndex
    setActiveSubtitleIndex(subtitleIndex)

    if (subtitleIndex >= 0) {
      const line = subtitles[subtitleIndex]
      if (line?.text) {
        speakText(line.text)
      }
    }
  }

  return (
    <div className="page">
      <div className="hero">
        <h1>YouTube Subtitle Translator + Dub Preview</h1>
        <p>Paste a YouTube link, translate the captions, then preview spoken dubbing synced to subtitle timing.</p>
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
          <option value="es">🇪🇸 Spanish (Español)</option>
          <option value="pt-BR">🇧🇷 Portuguese (Brazil)</option>
          <option value="pt">🇵🇹 Portuguese</option>
          <option value="ca">🏴 Catalan</option>
          <option value="gl">🏴 Galician</option>
          <option value="eu">🏴 Basque (Euskera)</option>
          <option disabled>──────────</option>
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
          <option disabled>──────────</option>
          <option value="ar">🇸🇦 Arabic (العربية)</option>
          <option value="he">🇮🇱 Hebrew (עברית)</option>
          <option value="tr">🇹🇷 Turkish (Türkçe)</option>
          <option value="az">🇦🇿 Azerbaijani (Azərbaycan)</option>
          <option value="ky">🇰🇬 Kyrgyz (Кыргызча)</option>
          <option disabled>──────────</option>
          <option value="eo">🌍 Esperanto</option>
          <option value="sq">🇦🇱 Albanian (Shqip)</option>
        </select>

        <label className="toggleRow">
          <input
            type="checkbox"
            checked={dubEnabled}
            onChange={(e) => {
              setDubEnabled(e.target.checked)
              if (!e.target.checked) stopSpeech()
            }}
          />
          <span>Enable spoken dub preview</span>
        </label>

        <button onClick={handleTranslate} disabled={isLoading}>
          {isLoading ? '⏳ Translating...' : 'Get and translate subtitles'}
        </button>

        {isLoading && (
          <button onClick={cancelTranslation} className="cancelButton">
            ❌ Cancel Translation
          </button>
        )}

        {isLoading && (
          <div className="progressContainer">
            <div className="progressBar">
              <div className="progressFill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progressText">
              {progressText && <span className="progressLabel">{progressText}</span>}
              <span className="progressPercent">{Math.round(progress)}%</span>
            </div>
          </div>
        )}

        <p className="status">{status}</p>
      </div>

      {videoId && (
        <div className="videoCard">
          <div ref={playerContainerRef} />
        </div>
      )}

      {(originalSubtitles.length > 0 || subtitles.length > 0) && (
        <div className="subtitlesGrid">
          <div className="subCard">
            <h2>Original captions</h2>
            <div className="subList">
              {originalSubtitles.map((line, index) => (
                <div className="subRow" key={`o-${index}`}>
                  <button
                    type="button"
                    className="timeButton"
                    onClick={() => jumpToSubtitle(Number(line.start || 0))}
                  >
                    {Number(line.start || 0).toFixed(1)}s
                  </button>

                  <span className="subText">{line.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="subCard">
            <h2>Translated captions</h2>
            <div className="subList">
              {subtitles.map((line, index) => (
                <div className="subRow" key={`o-${index}`}>
                  <button
                    type="button"
                    className="timeButton"
                    onClick={() => jumpToSubtitle(Number(line.start || 0))}
                  >
                    {Number(line.start || 0).toFixed(1)}s
                  </button>

                  <span className="subText">{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}