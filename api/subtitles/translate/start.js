// Vercel serverless function for starting translation jobs
import fetch from 'node-fetch';
import { YoutubeTranscript } from 'youtube-transcript';

// Simple global store (limitations in serverless - use Redis/DB in production)
const jobs = global.jobs || (global.jobs = new Map());

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoUrl, targetLang } = req.body;

    if (!videoUrl || !targetLang) {
      return res.status(400).json({ error: 'videoUrl and targetLang are required' });
    }

    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize job progress
    const jobData = {
      jobId,
      progress: 0,
      message: 'Job created',
      done: false,
      error: false,
      result: null,
      errorMessage: null,
      startTime: Date.now()
    };
    
    jobs.set(jobId, jobData);

    // Start background processing
    processTranslation(jobId, videoUrl, targetLang).catch(console.error);

    res.status(200).json({
      jobId,
      message: 'Translation started'
    });

  } catch (error) {
    console.error('Error starting translation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function processTranslation(jobId, videoUrl, targetLang) {
  const jobs = global.jobs || (global.jobs = new Map());
  
  try {
    // Update progress
    jobs.set(jobId, { ...jobs.get(jobId), progress: 10, message: 'Extracting video ID...' });

    // Extract YouTube video ID
    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      jobs.set(jobId, {
        ...jobs.get(jobId),
        done: true,
        error: true,
        errorMessage: 'Invalid YouTube URL'
      });
      return;
    }

    jobs.set(jobId, { ...jobs.get(jobId), progress: 20, message: 'Fetching transcript...' });

    // Get transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    jobs.set(jobId, { ...jobs.get(jobId), progress: 40, message: 'Processing transcript...' });

    // Convert transcript format
    const originalSubtitles = transcript.map(item => ({
      text: item.text,
      start: item.offset / 1000, // Convert to seconds
      duration: item.duration / 1000
    }));

    jobs.set(jobId, { ...jobs.get(jobId), progress: 60, message: 'Translating text...' });

    // Translate each subtitle
    const translatedSubtitles = [];
    const batchSize = 5; // Process in batches

    for (let i = 0; i < originalSubtitles.length; i += batchSize) {
      const batch = originalSubtitles.slice(i, i + batchSize);
      const batchPromises = batch.map(subtitle => 
        translateText(subtitle.text, 'en', targetLang)
          .then(translatedText => ({
            ...subtitle,
            text: translatedText
          }))
          .catch(err => ({
            ...subtitle,
            text: subtitle.text // Fallback to original on error
          }))
      );

      const batchResults = await Promise.all(batchPromises);
      translatedSubtitles.push(...batchResults);

      // Update progress
      const progressPercent = 60 + Math.floor((i / originalSubtitles.length) * 35);
      jobs.set(jobId, { 
        ...jobs.get(jobId), 
        progress: progressPercent, 
        message: `Translating... ${Math.min(i + batchSize, originalSubtitles.length)}/${originalSubtitles.length} lines`
      });
    }

    // Complete job
    jobs.set(jobId, {
      ...jobs.get(jobId),
      progress: 100,
      message: 'Translation complete',
      done: true,
      result: {
        originalSubtitles,
        translatedSubtitles
      }
    });

  } catch (error) {
    console.error('Translation error:', error);
    jobs.set(jobId, {
      ...jobs.get(jobId),
      done: true,
      error: true,
      errorMessage: error.message || 'Translation failed'
    });
  }
}

function extractYouTubeId(url) {
  try {
    if (!url) return null;

    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1].split('?')[0];
    }

    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/embed/')[1]?.split('?')[0] || null;
      }
      return urlObj.searchParams.get('v') || null;
    }

    return null;
  } catch {
    return null;
  }
}

async function translateText(text, sourceLang, targetLang) {
  try {
    // Use LibreTranslate public API
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text
  }
}
