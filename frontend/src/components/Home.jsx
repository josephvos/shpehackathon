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
    ca: 'ca-ES',
    gl: 'gl-ES',
    eu: 'eu-ES',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
    ru: 'ru-RU',
    ar: 'ar-SA',
    hi: 'hi-IN',
    nl: 'nl-NL',
    sv: 'sv-SE',
    da: 'da-DK',
    nb: 'nb-NO',
    fi: 'fi-FI',
    pl: 'pl-PL',
    cs: 'cs-CZ',
    sk: 'sk-SK',
    sl: 'sl-SI',
    hu: 'hu-HU',
    ro: 'ro-RO',
    bg: 'bg-BG',
    uk: 'uk-UA',
    el: 'el-GR',
    ga: 'ga-IE',
    et: 'et-EE',
    lv: 'lv-LV',
    lt: 'lt-LT',
    th: 'th-TH',
    vi: 'vi-VN',
    id: 'id-ID',
    ms: 'ms-MY',
    tl: 'fil-PH',
    bn: 'bn-BD',
    ur: 'ur-PK',
    fa: 'fa-IR',
    he: 'he-IL',
    tr: 'tr-TR',
    az: 'az-AZ',
    ky: 'ky-KG',
    eo: 'eo',
    sq: 'sq-AL'
  }

  return map[appLang] || 'en-US'
}

function normalizeSubtitleLines(lines) {
  return [...(lines || [])]
    .filter((line) => line && typeof line.text === 'string')
    .map((line) => ({
      text: line.text.trim(),
      start: Number(line.start || 0),
      duration: Math.max(Number(line.duration || 0), 0.05)
    }))
    .filter((line) => line.text.length > 0)
    .sort((a, b) => a.start - b.start)
}

export default function Home() {
  const DONE_SOUND_URL =
    'https://res.cloudinary.com/dvucimldu/video/upload/v1775361361/Ding_-_Sound_Effect_f8pnje.mp3'

  const [url, setUrl] = useState('')
  const [lang, setLang] = useState('es')
  const [status, setStatus] = useState('')
  const [subtitles, setSubtitles] = useState([])
  const [originalSubtitles, setOriginalSubtitles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState(-1)
  const [dubEnabled, setDubEnabled] = useState(true)
  const [dubSessionActive, setDubSessionActive] = useState(false)

  const doneSoundRef = useRef(null)
  const playerRef = useRef(null)
  const playerContainerRef = useRef(null)
  const playerReadyRef = useRef(false)
  const syncIntervalRef = useRef(null)

  const currentSubtitleIndexRef = useRef(-1)
  const lastSpokenIndexRef = useRef(-1)
  const lastVideoTimeRef = useRef(0)
  const voicesReadyRef = useRef(false)
  const speakRetryTimeoutRef = useRef(null)
  const currentUtteranceRef = useRef(null)
  const pendingSeekRef = useRef(false)
  const dubSessionActiveRef = useRef(false)
  const dubEnabledRef = useRef(true)
  const translatedSubtitlesRef = useRef([])
  const langRef = useRef('es')
  const speechUnlockedRef = useRef(false)

  const videoId = useMemo(() => getYouTubeId(url), [url])

  const sortedOriginalSubtitles = useMemo(
    () => normalizeSubtitleLines(originalSubtitles),
    [originalSubtitles]
  )

  const sortedTranslatedSubtitles = useMemo(
    () => normalizeSubtitleLines(subtitles),
    [subtitles]
  )

  const isTranslationReady = !isLoading && sortedTranslatedSubtitles.length > 0

  useEffect(() => {
    translatedSubtitlesRef.current = sortedTranslatedSubtitles
  }, [sortedTranslatedSubtitles])

  useEffect(() => {
    dubEnabledRef.current = dubEnabled
  }, [dubEnabled])

  useEffect(() => {
    langRef.current = lang
  }, [lang])

  useEffect(() => {
    dubSessionActiveRef.current = dubSessionActive
  }, [dubSessionActive])

  const clearSpeakRetry = () => {
    if (speakRetryTimeoutRef.current) {
      clearTimeout(speakRetryTimeoutRef.current)
      speakRetryTimeoutRef.current = null
    }
  }

  const stopSpeech = () => {
    clearSpeakRetry()

    if (!('speechSynthesis' in window)) return

    try {
      window.speechSynthesis.cancel()
    } catch (e) {
      console.log('speech cancel failed', e)
    }

    currentUtteranceRef.current = null
  }

  const playDoneSound = () => {
    try {
      if (!doneSoundRef.current) {
        doneSoundRef.current = new Audio(DONE_SOUND_URL)
        doneSoundRef.current.preload = 'auto'
      }

      doneSoundRef.current.currentTime = 0
      doneSoundRef.current.play().catch((e) => {
        console.log('sound play blocked', e)
      })
    } catch (e) {
      console.log('sound error', e)
    }
  }

  const ensureVoicesReady = () => {
    if (!('speechSynthesis' in window)) return

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      voicesReadyRef.current = true
      return
    }

    window.speechSynthesis.onvoiceschanged = () => {
      const updatedVoices = window.speechSynthesis.getVoices()
      if (updatedVoices.length > 0) {
        voicesReadyRef.current = true
      }
    }
  }

  const unlockSpeech = () => {
    if (!('speechSynthesis' in window)) return
    if (speechUnlockedRef.current) return

    try {
      const utterance = new SpeechSynthesisUtterance(' ')
      utterance.volume = 0
      utterance.rate = 1
      utterance.onend = () => {
        speechUnlockedRef.current = true
      }
      utterance.onerror = () => {
        speechUnlockedRef.current = true
      }
      window.speechSynthesis.speak(utterance)
      speechUnlockedRef.current = true
    } catch (e) {
      console.log('speech unlock failed', e)
    }
  }

  const pickBestVoice = (speechLang) => {
    const voices = window.speechSynthesis.getVoices()
    const target = speechLang.toLowerCase()
    const base = speechLang.slice(0, 2).toLowerCase()

    return (
      voices.find((v) => v.lang?.toLowerCase() === target) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(base + '-')) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(base)) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ||
      null
    )
  }

  const applyDubAudioMode = () => {
    const player = playerRef.current
    if (!player || !playerReadyRef.current) return

    if (dubEnabledRef.current && dubSessionActiveRef.current) {
      player.mute()
    } else {
      player.unMute()
      player.setVolume(100)
    }
  }

  const speakLine = (lineText) => {
    if (
      !dubEnabledRef.current ||
      !dubSessionActiveRef.current ||
      !lineText ||
      !('speechSynthesis' in window)
    ) {
      return
    }

    ensureVoicesReady()

    if (!voicesReadyRef.current) {
      clearSpeakRetry()
      speakRetryTimeoutRef.current = setTimeout(() => {
        speakLine(lineText)
      }, 250)
      return
    }

    try {
      window.speechSynthesis.cancel()
      window.speechSynthesis.resume()
    } catch (e) {
      console.log('speech reset failed', e)
    }

    const utterance = new SpeechSynthesisUtterance(lineText)
    utterance.lang = getSpeechLang(langRef.current)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    const voice = pickBestVoice(utterance.lang)
    if (voice) utterance.voice = voice

    utterance.onend = () => {
      if (currentUtteranceRef.current === utterance) {
        currentUtteranceRef.current = null
      }
    }

    utterance.onerror = (e) => {
      if (currentUtteranceRef.current === utterance) {
        currentUtteranceRef.current = null
      }
      console.log('TTS error:', e)
    }

    currentUtteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const findLastStartedSubtitleIndex = (timeSeconds) => {
    const lines = translatedSubtitlesRef.current
    let result = -1

    for (let i = 0; i < lines.length; i++) {
      if (timeSeconds + 0.05 >= lines[i].start) {
        result = i
      } else {
        break
      }
    }

    return result
  }

  const syncDubToVideo = () => {
    const player = playerRef.current
    const lines = translatedSubtitlesRef.current

    if (!player || !playerReadyRef.current || !window.YT || lines.length === 0) return

    const state = player.getPlayerState?.()
    if (state !== window.YT.PlayerState.PLAYING) return

    const currentTime = player.getCurrentTime?.() || 0
    const lastTime = lastVideoTimeRef.current
    const jumped = Math.abs(currentTime - lastTime) > 1.2

    const activeIndex = findLastStartedSubtitleIndex(currentTime)
    currentSubtitleIndexRef.current = activeIndex
    setActiveSubtitleIndex(activeIndex)

    if (jumped || pendingSeekRef.current) {
      pendingSeekRef.current = false
      stopSpeech()

      if (dubEnabledRef.current && dubSessionActiveRef.current) {
        if (activeIndex >= 0) {
          speakLine(lines[activeIndex].text)
          lastSpokenIndexRef.current = activeIndex
        } else {
          lastSpokenIndexRef.current = -1
        }
      } else {
        lastSpokenIndexRef.current = -1
      }

      lastVideoTimeRef.current = currentTime
      return
    }

    if (
      dubEnabledRef.current &&
      dubSessionActiveRef.current &&
      activeIndex >= 0 &&
      activeIndex !== lastSpokenIndexRef.current
    ) {
      speakLine(lines[activeIndex].text)
      lastSpokenIndexRef.current = activeIndex
    }

    lastVideoTimeRef.current = currentTime
  }

  const startSyncLoop = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
    }

    syncIntervalRef.current = setInterval(syncDubToVideo, 100)
  }

  const destroyPlayer = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    stopSpeech()
    currentSubtitleIndexRef.current = -1
    lastSpokenIndexRef.current = -1
    setActiveSubtitleIndex(-1)

    if (playerRef.current?.destroy) {
      playerRef.current.destroy()
    }

    playerRef.current = null
    playerReadyRef.current = false
  }

  const startDubbedPlayback = (startTime = null) => {
    const player = playerRef.current
    if (!player || !playerReadyRef.current) return
    if (!translatedSubtitlesRef.current.length) return

    unlockSpeech()
    setDubSessionActive(true)
    dubSessionActiveRef.current = true
    pendingSeekRef.current = true
    stopSpeech()

    applyDubAudioMode()

    if (typeof startTime === 'number') {
      player.seekTo(startTime, true)
      lastVideoTimeRef.current = startTime
    } else {
      lastVideoTimeRef.current = player.getCurrentTime?.() || 0
    }

    player.playVideo()

    const now =
      typeof startTime === 'number'
        ? startTime
        : player.getCurrentTime?.() || 0

    const idx = findLastStartedSubtitleIndex(now)
    currentSubtitleIndexRef.current = idx
    lastSpokenIndexRef.current = -1
    setActiveSubtitleIndex(idx)

    setTimeout(() => {
      syncDubToVideo()
    }, 180)
  }

  const stopDubbedPlayback = () => {
    setDubSessionActive(false)
    dubSessionActiveRef.current = false
    stopSpeech()
    applyDubAudioMode()
  }

  useEffect(() => {
    ensureVoicesReady()
  }, [])

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
            event.target.unMute()
            event.target.setVolume(100)
            startSyncLoop()
          },
          onStateChange: (event) => {
            const state = event.data

            if (state === window.YT.PlayerState.PLAYING) {
              applyDubAudioMode()

              try {
                window.speechSynthesis.resume()
              } catch (e) {
                console.log('speech resume failed', e)
              }

              const now = playerRef.current?.getCurrentTime?.() || 0
              lastVideoTimeRef.current = now

              const idx = findLastStartedSubtitleIndex(now)
              currentSubtitleIndexRef.current = idx
              setActiveSubtitleIndex(idx)

              if (dubEnabledRef.current && dubSessionActiveRef.current) {
                if (idx >= 0 && idx !== lastSpokenIndexRef.current) {
                  speakLine(translatedSubtitlesRef.current[idx]?.text || '')
                  lastSpokenIndexRef.current = idx
                }
              }
            }

            if (state === window.YT.PlayerState.PAUSED) {
              stopSpeech()
            }

            if (state === window.YT.PlayerState.BUFFERING) {
              stopSpeech()
              lastSpokenIndexRef.current = -1
            }

            if (state === window.YT.PlayerState.ENDED) {
              stopSpeech()
              currentSubtitleIndexRef.current = -1
              lastSpokenIndexRef.current = -1
              setActiveSubtitleIndex(-1)
              setDubSessionActive(false)
              dubSessionActiveRef.current = false
              applyDubAudioMode()
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

    return () => {}
  }, [videoId])

  useEffect(() => {
    return () => {
      destroyPlayer()
    }
  }, [])

  useEffect(() => {
    stopSpeech()
    currentSubtitleIndexRef.current = -1
    lastSpokenIndexRef.current = -1
    setActiveSubtitleIndex(-1)
    setDubSessionActive(false)
    dubSessionActiveRef.current = false
    applyDubAudioMode()
  }, [lang])

  useEffect(() => {
    if (!dubEnabled) {
      stopDubbedPlayback()
    } else {
      applyDubAudioMode()
    }
  }, [dubEnabled])

  const cancelTranslation = () => {
    setIsLoading(false)
    setProgress(0)
    setProgressText('')
    setStatus('Translation cancelled')
  }

  const handleTranslate = async () => {
    if (!url) {
      setStatus('Paste a YouTube link first.')
      return
    }

    setIsLoading(true)
    setProgress(0)
    setProgressText('Starting translation job...')
    setStatus('Starting backend translation...')
    setSubtitles([])
    setOriginalSubtitles([])
    stopSpeech()
    lastSpokenIndexRef.current = -1
    currentSubtitleIndexRef.current = -1
    setActiveSubtitleIndex(-1)
    setDubSessionActive(false)
    dubSessionActiveRef.current = false
    applyDubAudioMode()

    let pollInterval = null

    try {
      const startRes = await axios.post('/api/subtitles/translate/start', {
        videoUrl: url,
        targetLang: lang
      })

      const jobId = startRes.data.jobId

      setStatus('Translation started')
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
              setStatus(data.errorMessage || 'Translation failed')
              setProgress(0)
              setProgressText('')
              return
            }

            setOriginalSubtitles(normalizeSubtitleLines(data.result?.originalSubtitles || []))
            setSubtitles(normalizeSubtitleLines(data.result?.translatedSubtitles || []))
            setStatus(
              `Translation complete! Translated ${data.result?.translatedSubtitles?.length || 0} lines.`
            )
            playDoneSound()

            setTimeout(() => {
              setIsLoading(false)
              setProgress(0)
              setProgressText('')
            }, 800)
          }
        } catch (pollErr) {
          clearInterval(pollInterval)
          setIsLoading(false)
          setProgress(0)
          setProgressText('')
          setStatus(`Failed while checking progress: ${pollErr.message}`)
        }
      }, 1000)
    } catch (err) {
      if (pollInterval) clearInterval(pollInterval)
      setIsLoading(false)
      setProgress(0)
      setProgressText('')
      setStatus(err.message || 'Something went wrong')
    }
  }

  const jumpToSubtitle = (startTime) => {
    const player = playerRef.current
    if (!player || !playerReadyRef.current) return

    if (dubEnabledRef.current) {
      startDubbedPlayback(Number(startTime || 0))
      return
    }

    pendingSeekRef.current = true
    stopSpeech()
    player.unMute()
    player.setVolume(100)
    player.seekTo(startTime, true)
    player.playVideo()

    const idx = findLastStartedSubtitleIndex(startTime)
    currentSubtitleIndexRef.current = idx
    lastSpokenIndexRef.current = -1
    setActiveSubtitleIndex(idx)

    setTimeout(() => {
      lastVideoTimeRef.current = startTime
      syncDubToVideo()
    }, 200)
  }

  const isRowActive = (index) => index === activeSubtitleIndex

  return (
    <div className="page">
      <div className="hero">
        <div className="heroBadge">TTS dub preview</div>
        <h1>YouTube Subtitle Translator + Dub Preview</h1>
        <p>
          Translate captions, jump to any timestamp, and play a muted video with synced
          speech synthesis on top.
        </p>
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
            className="toggleInput"
            checked={dubEnabled}
            onChange={(e) => setDubEnabled(e.target.checked)}
          />
          <span className="customCheck" />
          <span>Enable spoken dub preview</span>
        </label>

        <div className="buttonGroup">
          <button onClick={handleTranslate} disabled={isLoading}>
            {isLoading ? 'Translating...' : 'Get and translate subtitles'}
          </button>

          {isTranslationReady && (
            <button
              type="button"
              className={`playButton ${dubSessionActive ? 'playButtonActive' : ''}`}
              onClick={() => {
                if (dubSessionActive) {
                  stopDubbedPlayback()
                } else {
                  startDubbedPlayback()
                }
              }}
            >
              {dubSessionActive ? 'Stop Dubbed Video' : 'Play Dubbed Video'}
            </button>
          )}

          {isLoading && (
            <button onClick={cancelTranslation} className="cancelButton">
              Cancel Translation
            </button>
          )}
        </div>

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

        <p className="status">
          {isLoading ? (
            <span className="statusLoading">
              <span className="spinner" />
              {status || 'Translation started'}
            </span>
          ) : (
            status
          )}
        </p>
      </div>

      {videoId && (
        <div className="videoCard">
          <div className="videoHeader">
            <div>
              <h2>Video preview</h2>
              <p>
                {dubSessionActive && dubEnabled
                  ? 'English audio muted. TTS dub is active.'
                  : 'Original video audio is active.'}
              </p>
            </div>
            <div className={`modePill ${dubSessionActive && dubEnabled ? 'modePillActive' : ''}`}>
              {dubSessionActive && dubEnabled ? 'Dub mode ON' : 'Dub mode OFF'}
            </div>
          </div>
          <div ref={playerContainerRef} />
        </div>
      )}

      {(sortedOriginalSubtitles.length > 0 || sortedTranslatedSubtitles.length > 0) && (
        <div className="subtitlesGrid">
          <div className="subCard">
            <h2>Original captions</h2>
            <div className="subList">
              {sortedOriginalSubtitles.map((line, index) => (
                <div className={`subRow ${isRowActive(index) ? 'active' : ''}`} key={`o-${index}`}>
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
              {sortedTranslatedSubtitles.map((line, index) => (
                <div className={`subRow ${isRowActive(index) ? 'active' : ''}`} key={`t-${index}`}>
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