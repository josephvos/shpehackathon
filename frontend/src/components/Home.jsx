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
    'es-ES': 'es-ES',
    'es-MX': 'es-MX', 
    'es-US': 'es-US',
    'es-AR': 'es-AR',
    en: 'en-US',
    'en-US': 'en-US',
    'en-GB': 'en-GB',
    fr: 'fr-FR',
    'fr-FR': 'fr-FR',
    'fr-CA': 'fr-CA',
    de: 'de-DE',
    'de-DE': 'de-DE',
    it: 'it-IT',
    'it-IT': 'it-IT',
    pt: 'pt-PT',
    'pt-PT': 'pt-PT',
    'pt-BR': 'pt-BR',
    ja: 'ja-JP',
    'ja-JP': 'ja-JP',
    ko: 'ko-KR',
    'ko-KR': 'ko-KR',
    zh: 'zh-CN',
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    ru: 'ru-RU',
    'ru-RU': 'ru-RU',
    ar: 'ar-SA',
    'ar-SA': 'ar-SA',
    hi: 'hi-IN',
    'hi-IN': 'hi-IN'
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
  const [currentVoice, setCurrentVoice] = useState(null)
  const [availableVoices, setAvailableVoices] = useState([])
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakingText, setSpeakingText] = useState('')
  const [speakingIndex, setSpeakingIndex] = useState(-1)
  const [hasEverHadSubtitles, setHasEverHadSubtitles] = useState(false)
  const [isContinuousDubActive, setIsContinuousDubActive] = useState(false)

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
  const isContinuousDubActiveRef = useRef(false)

  const videoId = useMemo(() => getYouTubeId(url), [url])

  // Reset hasEverHadSubtitles when video changes
  useEffect(() => {
    console.log('🔄 Video changed, resetting state. New videoId:', videoId)
    setHasEverHadSubtitles(false)
    setSubtitles([])
    setOriginalSubtitles([])
    setIsContinuousDubActive(false) // Reset continuous dubbing when video changes
    isContinuousDubActiveRef.current = false
  }, [videoId])

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    setSpeakingText('')
    setSpeakingIndex(-1)
    setIsContinuousDubActive(false)
    isContinuousDubActiveRef.current = false
  }

  const findBestVoice = (targetLang) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) return null

    const langCode = getSpeechLang(targetLang)
    
    // Female voice preferences for Spanish (prioritizing Paulina since user mentioned "Pauline")
    const femaleSpanishNames = ['Paulina', 'Mónica', 'Monica', 'Esperanza', 'Marisol', 'Carmen', 'Isabel', 'Sofia', 'Maria', 'Ana']
    const maleSpanishNames = ['Diego', 'Jorge', 'Juan', 'Carlos', 'Fernando', 'Miguel', 'Antonio', 'Pablo', 'Emilio']
    
    // First try to find Paulina specifically
    let bestVoice = voices.find(v => {
      const voiceLang = v.lang?.toLowerCase()
      const voiceName = v.name?.toLowerCase()
      return voiceLang === langCode.toLowerCase() && voiceName.includes('paulina')
    })

    // If no Paulina, try other female Spanish voices
    if (!bestVoice) {
      bestVoice = voices.find(v => {
        const voiceLang = v.lang?.toLowerCase()
        const voiceName = v.name?.toLowerCase()
        return voiceLang === langCode.toLowerCase() && 
               (femaleSpanishNames.some(name => voiceName.includes(name.toLowerCase())) ||
                voiceName.includes('female') || 
                voiceName.includes('woman'))
      })
    }

    // If no female voice found, try any voice for the specific language
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang?.toLowerCase() === langCode.toLowerCase())
    }

    // If still no voice, try language family (e.g., 'es' for 'es-ES')
    if (!bestVoice) {
      const langFamily = langCode.split('-')[0]
      bestVoice = voices.find(v => {
        const voiceLang = v.lang?.toLowerCase()
        const voiceName = v.name?.toLowerCase()
        return voiceLang?.startsWith(langFamily) && 
               (femaleSpanishNames.some(name => voiceName.includes(name.toLowerCase())) ||
                voiceName.includes('female') || 
                voiceName.includes('woman'))
      })
    }

    // Fallback to any voice in the language family
    if (!bestVoice) {
      const langFamily = langCode.split('-')[0]
      bestVoice = voices.find(v => v.lang?.toLowerCase()?.startsWith(langFamily))
    }

    return bestVoice
  }

  const speakText = (text) => {
    if (!dubEnabled || !text || !('speechSynthesis' in window)) return

    // Ensure voices are loaded
    const ensureVoicesLoaded = () => {
      return new Promise((resolve) => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          resolve()
          return
        }
        
        const onVoicesChanged = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
          resolve()
        }
        
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
        
        // Fallback timeout
        setTimeout(resolve, 1000)
      })
    }

    ensureVoicesLoaded().then(() => {
      stopSpeech()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = getSpeechLang(lang)
      utterance.rate = 1.0  // Slightly slower for better clarity
      utterance.pitch = 0.9 // Lower pitch for more masculine sound
      utterance.volume = 1.0

      const selectedVoice = selectedVoiceId 
        ? window.speechSynthesis.getVoices().find(v => 
            (v.voiceURI === selectedVoiceId) || (v.name === selectedVoiceId)
          )
        : findBestVoice(lang)
      
      if (selectedVoice) {
        utterance.voice = selectedVoice
        setCurrentVoice(selectedVoice)
        console.log(`🎤 Using voice: ${selectedVoice.name} (${selectedVoice.lang})`)
      } else {
        setCurrentVoice(null)
        console.log('⚠️ No suitable voice found, using default')
      }

      // Add error handling
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error)
        setIsSpeaking(false)
        setSpeakingText('')
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true
        currentUtteranceRef.current = utterance
        setIsSpeaking(true)
        setSpeakingText(text)
      }

      utterance.onend = () => {
        isSpeakingRef.current = false
        currentUtteranceRef.current = null
        setIsSpeaking(false)
        setSpeakingText('')
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  const testCurrentVoice = () => {
    const testText = lang === 'es' 
      ? '¡Hola! Esta es una prueba de la voz masculina en español. ¿Puedes escucharme correctamente?' 
      : 'Hello! This is a voice test. Can you hear me correctly?'
    
    speakText(testText)
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

  // Initialize voices and set the current voice for the selected language
  useEffect(() => {
    if (!('speechSynthesis' in window)) return

    const initializeVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        // Filter voices for current language
        const langCode = getSpeechLang(lang)
        const langFamily = langCode.split('-')[0]
        const relevantVoices = voices.filter(v => {
          const voiceLang = v.lang?.toLowerCase()
          return voiceLang === langCode.toLowerCase() || voiceLang?.startsWith(langFamily)
        })
        
        setAvailableVoices(relevantVoices)
        
        // Set best voice if no manual selection
        if (!selectedVoiceId) {
          const bestVoice = findBestVoice(lang)
          if (bestVoice) {
            setCurrentVoice(bestVoice)
            setSelectedVoiceId(bestVoice.voiceURI || bestVoice.name)
            console.log(`🎤 Voice auto-selected: ${bestVoice.name} (${bestVoice.lang})`)
          }
        } else {
          // Use manually selected voice
          const selectedVoice = voices.find(v => 
            (v.voiceURI === selectedVoiceId) || (v.name === selectedVoiceId)
          )
          if (selectedVoice) {
            setCurrentVoice(selectedVoice)
          }
        }
      }
    }

    // Try to load voices immediately
    initializeVoice()

    // Also listen for voice changes (some browsers load voices asynchronously)
    const handleVoicesChanged = () => {
      initializeVoice()
    }

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
    }
  }, [lang, selectedVoiceId])

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
    setHasEverHadSubtitles(false)

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
            setHasEverHadSubtitles(true)
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

  const jumpToSubtitleAndSpeak = (startTime, text, lineIndex) => {
    const player = playerRef.current
    if (!player || !playerReadyRef.current) return

    // Jump to the timestamp
    stopSpeech()
    player.seekTo(startTime, true)
    player.playVideo()

    // Activate continuous dubbing and speak the Spanish caption
    setTimeout(() => {
      if (dubEnabled && text) {
        setIsContinuousDubActive(true)
        isContinuousDubActiveRef.current = true
        speakContinuousLines(lineIndex)
        console.log(`🎬 Starting continuous dub from line ${lineIndex}: "${text}"`)
      }
    }, 300) // 300ms delay to allow video to seek properly
  }

  const speakContinuousLines = (startIndex) => {
    if (!dubEnabled || startIndex >= subtitles.length) {
      console.log(`🛑 Cannot continue: dubEnabled=${dubEnabled}, startIndex=${startIndex}, subtitlesLength=${subtitles.length}`)
      return
    }

    const currentLine = subtitles[startIndex]
    if (!currentLine || !currentLine.text) {
      console.log(`🛑 No current line or text at index ${startIndex}`)
      return
    }

    console.log(`🎤 Speaking line ${startIndex}: "${currentLine.text}" | ContinuousActive: ${isContinuousDubActiveRef.current}`)
    
    // Create utterance for current line
    const utterance = new SpeechSynthesisUtterance(currentLine.text)
    utterance.lang = getSpeechLang(lang)
    utterance.rate = 1.0
    utterance.pitch = 0.9
    utterance.volume = 1.0

    // Set voice
    const selectedVoice = selectedVoiceId 
      ? window.speechSynthesis.getVoices().find(v => 
          (v.voiceURI === selectedVoiceId) || (v.name === selectedVoiceId)
        )
      : findBestVoice(lang)
    
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    // Handle speech events
    utterance.onstart = () => {
      setIsSpeaking(true)
      setSpeakingText(currentLine.text)
      setSpeakingIndex(startIndex)
      isSpeakingRef.current = true
      
      // Scroll the speaking subtitle into view within its container only (with gentle timing)
      setTimeout(() => {
        const speakingElement = document.querySelector(`[data-subtitle-index="${startIndex}"]`)
        const subtitleContainer = document.querySelector('.sidePanel .subList')
        
        if (speakingElement && subtitleContainer) {
          const containerRect = subtitleContainer.getBoundingClientRect()
          const elementRect = speakingElement.getBoundingClientRect()
          
          // Only scroll if the element is significantly outside the visible area
          const buffer = 80 // Increased buffer to reduce scrolling frequency
          if (elementRect.top < containerRect.top - buffer || 
              elementRect.bottom > containerRect.bottom + buffer) {
            const scrollTop = subtitleContainer.scrollTop + 
              (elementRect.top - containerRect.top) - 
              (containerRect.height / 4) + (elementRect.height / 2) // Show in upper quarter
            
            // Use requestAnimationFrame to prevent layout thrashing
            requestAnimationFrame(() => {
              subtitleContainer.scrollTo({
                top: Math.max(0, scrollTop), // Prevent negative scroll
                behavior: 'smooth'
              })
            })
          }
        }
      }, 300) // Longer delay to let speech start and reduce visual jumping
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setSpeakingText('')
      setSpeakingIndex(-1)
      isSpeakingRef.current = false

      // Continue to next line after a short pause
      const nextIndex = startIndex + 1
      if (nextIndex < subtitles.length && dubEnabled) {
        const nextLine = subtitles[nextIndex]
        const currentLineEnd = (currentLine.start || 0) + (currentLine.duration || 3)
        const nextLineStart = nextLine.start || 0
        const gapDuration = Math.max(0, (nextLineStart - currentLineEnd) * 1000) // Convert to ms
        
        // Wait for the natural gap between subtitles, with a minimum of 500ms
        const waitTime = Math.max(500, Math.min(gapDuration, 2000)) // Max 2 seconds, min 500ms
        
        console.log(`⏰ Waiting ${waitTime}ms before next line (${nextIndex})...`)
        
        setTimeout(() => {
          if (dubEnabled && !isSpeakingRef.current && isContinuousDubActiveRef.current) { // Use ref instead of state
            console.log(`🎬 Continuing to line ${nextIndex}: "${nextLine.text}"`)
            speakContinuousLines(nextIndex)
          } else {
            console.log(`🛑 Stopping continuous dub: dubEnabled=${dubEnabled}, speaking=${isSpeakingRef.current}, continuousActive=${isContinuousDubActiveRef.current}`)
            setIsContinuousDubActive(false)
            isContinuousDubActiveRef.current = false
          }
        }, waitTime)
      } else {
        console.log(`🏁 Reached end of subtitles or dub disabled. NextIndex: ${nextIndex}, Total: ${subtitles.length}, Enabled: ${dubEnabled}`)
        setIsContinuousDubActive(false) // End continuous dubbing when we reach the end
        isContinuousDubActiveRef.current = false
      }
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error)
      setIsSpeaking(false)
      setSpeakingText('')
      isSpeakingRef.current = false
    }

    // Stop any current speech and start new one
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
    }
    
    window.speechSynthesis.speak(utterance)
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

        {dubEnabled && (
          <div className="voiceControls">
            {availableVoices.length > 0 && (
              <div className="voiceSelection">
                <label>Choose Voice:</label>
                <select 
                  value={selectedVoiceId} 
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  className="voiceDropdown"
                >
                  <option value="">Auto-select best voice</option>
                  {availableVoices.map((voice) => {
                    const voiceName = voice.name?.toLowerCase() || ''
                    const isFemale = voiceName.includes('paulina') || voiceName.includes('mónica') || 
                                   voiceName.includes('monica') || voiceName.includes('esperanza') ||
                                   voiceName.includes('female') || voiceName.includes('woman')
                    const isMale = voiceName.includes('diego') || voiceName.includes('jorge') || 
                                 voiceName.includes('juan') || voiceName.includes('male') || 
                                 voiceName.includes('man')
                    
                    return (
                      <option key={voice.voiceURI || voice.name} value={voice.voiceURI || voice.name}>
                        {voice.name} ({voice.lang}) {isFemale ? '👩' : isMale ? '👨' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}
            
            <button onClick={testCurrentVoice} className="voiceTestButton" type="button">
              🎤 Test Voice
            </button>
            
            {isContinuousDubActive && (
              <button onClick={stopSpeech} className="stopDubButton" type="button">
                ⏹️ Stop Continuous Dub
              </button>
            )}
            {currentVoice && (
              <div className="currentVoice">
                <strong>Current Voice:</strong> {currentVoice.name} ({currentVoice.lang})
              </div>
            )}
          </div>
        )}

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
        <>
          {(hasEverHadSubtitles || isLoading) ? (
            <div className="videoWithSubtitles">
              <div className="videoSection">
                <div className="videoCard">
                  <div ref={playerContainerRef} />
                </div>
              </div>
              
              <div className="subtitlesSidePanel">
                <div className="subCard sidePanel">
                  <h2>Spanish Dub <span className="dubHint"></span></h2>
                  <div className="subList">
                    {isLoading && subtitles.length === 0 ? (
                      <div className="loadingMessage">
                        <p>🔄 Translating subtitles...</p>
                        <p>Video will remain visible during translation</p>
                      </div>
                    ) : (
                      subtitles.map((line, index) => (
                        <div 
                          className={`subRow ${isSpeaking && speakingIndex === index ? 'speaking' : ''}`} 
                          key={`t-${index}`}
                          data-subtitle-index={index}
                        >
                          <button
                            type="button"
                            className="timeButton"
                            onClick={() => jumpToSubtitleAndSpeak(Number(line.start || 0), line.text, index)}
                            title="Click to jump to this time and hear continuous Spanish dub"
                          >
                            {Number(line.start || 0).toFixed(1)}s
                          </button>
                          <span className="subText">
                            {line.text}
                            {isSpeaking && speakingIndex === index && <span className="speakingIndicator"> 🎤</span>}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="videoCard">
              <div ref={playerContainerRef} />
            </div>
          )}
        </>
      )}

      {originalSubtitles.length > 0 && (
        <div className="originalSubtitlesSection">
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
        </div>
      )}
    </div>
  )
}