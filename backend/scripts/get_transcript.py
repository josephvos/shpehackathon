import sys
import json
import warnings
from requests import RequestsDependencyWarning

warnings.filterwarnings("ignore", category=RequestsDependencyWarning)

from youtube_transcript_api import YouTubeTranscriptApi
def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing video id"}))
        sys.exit(1)

    video_id = sys.argv[1]

    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)

        items = []
        for snippet in transcript:
            items.append({
                "text": snippet.text,
                "start": snippet.start,
                "duration": snippet.duration
            })

        result = {
            "videoId": video_id,
            "language": getattr(transcript, "language_code", "unknown"),
            "items": items
        }

        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(2)

if __name__ == "__main__":
    main()