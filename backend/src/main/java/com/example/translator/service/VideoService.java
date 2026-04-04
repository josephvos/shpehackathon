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

        // Translate all available transcript lines
        int totalLines = transcript.items().size();
        System.out.println("STEP 3: Starting translation of " + totalLines + " lines...");
        
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < totalLines; i++) {
            SubtitleLine line = transcript.items().get(i);
            String translatedText = translateText(line.getText(), transcript.language(), targetLang);
            translated.add(new SubtitleLine(translatedText, line.getStart(), line.getDuration()));
            
            // Progress logging with percentage and estimated time
            int progress = ((i + 1) * 100) / totalLines;
            if ((i + 1) % Math.max(1, totalLines / 20) == 0 || i == totalLines - 1) { // Log every 5%
                long elapsed = System.currentTimeMillis() - startTime;
                long avgTimePerLine = elapsed / (i + 1);
                long remaining = (totalLines - i - 1) * avgTimePerLine;
                
                System.out.printf("STEP 3: Translation progress %d%% (%d/%d) - ETA: %d seconds%n", 
                    progress, i + 1, totalLines, remaining / 1000);
            }
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
            ProcessBuilder pb = new ProcessBuilder("python", "../scripts/get_transcript.py", videoId);
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
            
            // Create JSON payload for LibreTranslate
            String jsonPayload = String.format(
                "{\"q\": \"%s\", \"source\": \"%s\", \"target\": \"%s\"}",
                text.replace("\"", "\\\"").replace("\n", "\\n"),
                safeSource,
                targetLang
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://127.0.0.1:5000/translate"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new Exception("LibreTranslate API returned status: " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String translated = root.path("translatedText").asText();
            
            if (translated == null || translated.isBlank()) {
                System.out.println("LibreTranslate returned empty translation for: " + text);
                return text;
            }

            return translated;
        } catch (Exception e) {
            System.out.println("Translation failed for line: " + text);
            System.out.println("Reason: " + e.getMessage());
            return text; // Fallback to original text
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