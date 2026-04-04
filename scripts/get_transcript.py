import sys
import json
import warnings
from requests import RequestsDependencyWarning
from youtube_transcript_api import YouTubeTranscriptApi

warnings.filterwarnings("ignore", category=RequestsDependencyWarning)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing video id"}))
        sys.exit(1)

    video_id = sys.argv[1]

    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)  # returns FetchedTranscriptSnippet objects

        # Convert to simple dicts
        items = [
            {
                "text": s.text,
                "start": s.start,
                "duration": s.duration
            }
            for s in transcript
        ]

        result = {
            "videoId": video_id,
            "language": getattr(transcript, "language_code", "en"),
            "items": items
        }

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(2)

if __name__ == "__main__":
    main()