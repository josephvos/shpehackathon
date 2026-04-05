// Vercel serverless function for checking translation progress
// Access the same global store
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    // Get job progress from global store
    const jobProgress = jobs.get(jobId);
    
    if (!jobProgress) {
      return res.status(200).json({
        jobId,
        progress: 0,
        message: 'Job not found or expired',
        done: true,
        error: true,
        result: null,
        errorMessage: 'Job not found. This may happen if the job was created too long ago or in a different serverless instance.'
      });
    }

    // Check if job is too old (cleanup)
    const jobAge = Date.now() - (jobProgress.startTime || 0);
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    if (jobAge > maxAge) {
      jobs.delete(jobId);
      return res.status(200).json({
        jobId,
        progress: 0,
        message: 'Job expired',
        done: true,
        error: true,
        result: null,
        errorMessage: 'Job expired after 30 minutes'
      });
    }

    res.status(200).json(jobProgress);

  } catch (error) {
    console.error('Error checking progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
