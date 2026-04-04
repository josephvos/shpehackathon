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

  const videoId = useMemo(() => getYouTubeId(url), [url])
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : ''

  const handleTranslate = async () => {
    if (!url) {
      setStatus('Paste a YouTube link first.')
      return
    }

    setStatus('Getting captions and translating...')
    setSubtitles([])
    setOriginalSubtitles([])

    try {
      const response = await axios.post(
        '/api/subtitles/translate',
        {
          videoUrl: url,
          targetLang: lang
        },
        {
          timeout: 30000
        }
      )

      setOriginalSubtitles(response.data.originalSubtitles || [])
      setSubtitles(response.data.translatedSubtitles || [])
      setStatus('Done.')
    } catch (err) {
      setStatus(err.message || 'Something went wrong')
    }
  }

  return (
    <div className="page">
      <div className="hero">
        <h1>YouTube Subtitle Translator</h1>
        <p>Paste a YouTube link, fetch captions, and translate them instantly.</p>
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
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
        </select>

        <button onClick={handleTranslate}>Get and translate subtitles</button>
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