# YouTube Video Translator - Full-Stack Vercel Deployment

## 🚀 One-Click Full-Stack Deployment

Your app is now configured for complete deployment to Vercel with both frontend and backend!

### ✨ What's Included:

- **Frontend**: React + Vite application
- **Backend**: Node.js serverless functions
- **API Endpoints**: 
  - `POST /api/subtitles/translate/start` - Start translation job
  - `GET /api/subtitles/translate/progress/{jobId}` - Check progress
- **Translation**: Uses public LibreTranslate API
- **YouTube Integration**: Automatic transcript fetching

### 🎯 Quick Deploy

```bash
# One command to deploy everything
./deploy-vercel.sh
```

### 🔧 Manual Deployment Steps

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd /Users/joeyv/shpe/shpehackathon
   vercel --prod
   ```

### 📁 Project Structure for Vercel

```
/
├── vercel.json           # Vercel configuration
├── frontend/             # React frontend
│   ├── src/
│   ├── package.json
│   └── dist/            # Build output
└── api/                 # Serverless functions
    ├── package.json
    └── subtitles/
        └── translate/
            ├── start.js         # POST /api/subtitles/translate/start
            └── progress/
                └── [jobId].js   # GET /api/subtitles/translate/progress/{jobId}
```

### 🌐 API Endpoints

Once deployed, your API will be available at:

- **Start Translation**: `https://your-app.vercel.app/api/subtitles/translate/start`
- **Check Progress**: `https://your-app.vercel.app/api/subtitles/translate/progress/{jobId}`

### 🔧 Environment Configuration

No environment variables needed! The frontend automatically uses:
- **Development**: `http://localhost:8080` (for local Spring Boot)
- **Production**: Same domain (Vercel serverless functions)

### ⚠️ Production Considerations

1. **Job State**: Currently uses in-memory storage
   - Jobs may not persist across serverless cold starts
   - For production: Use Redis or database

2. **Translation Rate Limits**: 
   - Uses public LibreTranslate.de API
   - Consider upgrading for heavy usage

3. **YouTube API**: 
   - Uses `youtube-transcript` package
   - No API key required

### 🚀 Deployment Command

```bash
# Deploy everything at once
./deploy-vercel.sh
```

This will:
1. ✅ Install API dependencies
2. ✅ Install frontend dependencies  
3. ✅ Build the frontend
4. ✅ Deploy to Vercel
5. ✅ Configure routing for SPA + API

### 🎉 After Deployment

Your app will be live with:
- Frontend accessible at the root URL
- API endpoints at `/api/*`
- Automatic HTTPS
- Global CDN distribution
- Automatic deployments on git push

### 🔄 Local Development

```bash
# Start all services locally
./restart_all.sh

# Or just frontend (uses Vercel API in production)
cd frontend && npm run dev
```

### 📊 Monitoring

Check your Vercel dashboard for:
- Deployment logs
- Function execution logs
- Performance metrics
- Error tracking

### 🛠 Troubleshooting

1. **Build Errors**: Check `frontend/dist` exists after build
2. **API Errors**: Check Vercel function logs in dashboard
3. **CORS Issues**: Functions include CORS headers
4. **Job Not Found**: Jobs expire after 30 minutes (serverless limitation)

### 🔄 Updates

To update your deployment:
```bash
git add .
git commit -m "Update app"
git push  # If connected to git auto-deploy
# OR
./deploy-vercel.sh  # Manual deployment
```
