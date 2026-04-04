package com.example.translator.service;

import com.example.translator.dto.SubtitleLine;
import com.example.translator.dto.SubtitleTranslateResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class VideoService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public SubtitleTranslateResponse getAndTranslateSubtitles(String videoUrl, String targetLang) {
        String videoId = extractYouTubeId(videoUrl);
        if (videoId == null || videoId.isBlank()) {
            throw new RuntimeException("Invalid YouTube URL");
        }

        System.out.println("STEP 1: Extracted video ID = " + videoId);

        TranscriptResult transcript = fetchTranscriptFromPython(videoId);

        System.out.println("STEP 2: Captions fetched successfully");
        System.out.println("STEP 2.1: Source language = " + transcript.language());
        System.out.println("STEP 2.2: Caption count = " + transcript.items().size());

        if (transcript.items().isEmpty()) {
            throw new RuntimeException("Captions were fetched, but the transcript is empty.");
        }

        List<SubtitleLine> translated = new ArrayList<>();

        int limit = Math.min(transcript.items().size(), 15); // temporary test limit
        for (int i = 0; i < limit; i++) {
            SubtitleLine line = transcript.items().get(i);
            String translatedText = translateText(line.getText(), transcript.language(), targetLang);
            translated.add(new SubtitleLine(translatedText, line.getStart(), line.getDuration()));
            System.out.println("STEP 3: Translated line " + (i + 1) + " / " + limit);
        }

        System.out.println("STEP 4: Translation finished");

        return new SubtitleTranslateResponse(
                videoId,
                transcript.language(),
                targetLang,
                transcript.items(),
                translated
        );
    }

    private TranscriptResult fetchTranscriptFromPython(String videoId) {
        try {
            ProcessBuilder pb = new ProcessBuilder("python", "scripts/get_transcript.py", videoId);
            pb.redirectErrorStream(false);

            Process process = pb.start();

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line);
                }
            }

            boolean finished = process.waitFor(20, java.util.concurrent.TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("Transcript script timed out.");
            }

            int exitCode = process.exitValue();

            if (output.isEmpty()) {
                throw new RuntimeException("Transcript script returned no output.");
            }

            JsonNode root = objectMapper.readTree(output.toString());

            if (exitCode != 0 || root.has("error")) {
                throw new RuntimeException(
                        root.has("error") ? root.get("error").asText() : "Failed to fetch transcript"
                );
            }

            String language = root.path("language").asText("auto");
            List<SubtitleLine> items = new ArrayList<>();

            for (JsonNode item : root.path("items")) {
                items.add(new SubtitleLine(
                        item.path("text").asText(),
                        item.path("start").asDouble(),
                        item.path("duration").asDouble()
                ));
            }

            return new TranscriptResult(language, items);
        } catch (Exception e) {
            throw new RuntimeException("Transcript fetch failed: " + e.getMessage(), e);
        }
    }

    private String translateText(String text, String sourceLang, String targetLang) {
        try {
            String safeSource = normalizeLang(sourceLang);
            String encoded = java.net.URLEncoder.encode(text, StandardCharsets.UTF_8);

            String url = "https://api.mymemory.translated.net/get?q="
                    + encoded + "&langpair=" + safeSource + "|" + targetLang;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            JsonNode root = objectMapper.readTree(response.body());

            String translated = root.path("responseData").path("translatedText").asText();
            if (translated == null || translated.isBlank()) {
                return text;
            }

            return translated;
        } catch (Exception e) {
            System.out.println("Translation failed for line: " + text);
            System.out.println("Reason: " + e.getMessage());
            return text;
        }
    }

    private String normalizeLang(String sourceLang) {
        if (sourceLang == null || sourceLang.isBlank() || sourceLang.equals("unknown")) {
            return "en";
        }
        return sourceLang;
    }

    private String extractYouTubeId(String url) {
        try {
            if (url == null) return null;

            if (url.contains("youtu.be/")) {
                String id = url.substring(url.indexOf("youtu.be/") + 9);
                int q = id.indexOf('?');
                if (q >= 0) id = id.substring(0, q);
                return id;
            }

            if (url.contains("youtube.com/watch?v=")) {
                String id = url.substring(url.indexOf("v=") + 2);
                int amp = id.indexOf('&');
                if (amp >= 0) id = id.substring(0, amp);
                return id;
            }

            if (url.contains("youtube.com/embed/")) {
                String id = url.substring(url.indexOf("embed/") + 6);
                int q = id.indexOf('?');
                if (q >= 0) id = id.substring(0, q);
                return id;
            }

            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private record TranscriptResult(String language, List<SubtitleLine> items) {}
}