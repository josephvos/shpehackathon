// Utility functions for job management across serverless functions
import crypto from 'crypto';

// Since we can't persist data between function calls in basic Vercel,
// we'll use a simple approach with job data encoded in the jobId
export function createJobId(videoUrl, targetLang) {
  const timestamp = Date.now();
  const hash = crypto.createHash('sha256')
    .update(`${videoUrl}-${targetLang}-${timestamp}`)
    .digest('hex')
    .substr(0, 16);
  
  return `${timestamp}_${hash}`;
}

export function parseJobId(jobId) {
  const [timestamp, hash] = jobId.split('_');
  return {
    timestamp: parseInt(timestamp),
    hash,
    createdAt: new Date(parseInt(timestamp))
  };
}

export function isJobExpired(jobId, maxAgeMs = 30 * 60 * 1000) { // 30 minutes
  const { timestamp } = parseJobId(jobId);
  return Date.now() - timestamp > maxAgeMs;
}

// Simple in-memory store that will work across function calls
// In production, use Vercel KV, Redis, or a database
let globalJobStore = {};

export function setJobProgress(jobId, progress) {
  globalJobStore[jobId] = progress;
}

export function getJobProgress(jobId) {
  return globalJobStore[jobId] || null;
}

export function deleteJob(jobId) {
  delete globalJobStore[jobId];
}
