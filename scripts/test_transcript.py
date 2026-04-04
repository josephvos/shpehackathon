#!/usr/bin/env python3
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

# Simple test script
video_id = sys.argv[1] if len(sys.argv) > 1 else "dQw4w9WgXcQ"

try:
    print(f"Testing video ID: {video_id}")
    
    # Try the basic approach first
    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    print(f"Found transcripts: {len(list(transcript_list))}")
    
    # Get first available transcript
    for transcript in transcript_list:
        print(f"Language: {transcript.language_code}")
        data = transcript.fetch()
        print(f"Transcript length: {len(data)}")
        
        # Convert to our format
        items = []
        for entry in data[:5]:  # Only first 5 entries for testing
            items.append({
                "text": entry["text"].strip(),
                "start": entry["start"], 
                "duration": entry["duration"]
            })
        
        result = {
            "videoId": video_id,
            "language": transcript.language_code,
            "items": items
        }
        
        print(json.dumps(result, ensure_ascii=False))
        break
        
except Exception as e:
    print(f"Error: {e}")
    print(json.dumps({"error": str(e)}))
