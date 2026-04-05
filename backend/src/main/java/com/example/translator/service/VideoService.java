package com.example.translator.service;

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
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.example.translator.dto.SubtitleLine;
import com.example.translator.dto.SubtitleTranslateRequest;
import com.example.translator.dto.SubtitleTranslateResponse;
import com.example.translator.dto.TranslationProgress;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.fasterxml.jackson.databind.node.ObjectNode;

@Service
public class VideoService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ConcurrentHashMap<String, TranslationProgress> progressStore = new ConcurrentHashMap<>();

    public String startTranslationJob(SubtitleTranslateRequest request) {
        String jobId = UUID.randomUUID().toString();

        progressStore.put(jobId, new TranslationProgress(
                jobId,
                0,
                "Job created",
                false,
                false,
                null,
                null));

        Thread worker = new Thread(() -> {
            try {
                SubtitleTranslateResponse result = getAndTranslateSubtitlesWithProgress(
                        request.getVideoUrl(),
                        request.getTargetLang(),
                        jobId);

                progressStore.put(jobId, new TranslationProgress(
                        jobId,
                        100,
                        "Translation complete",
                        true,
                        false,
                        null,
                        result));
            } catch (Exception e) {
                progressStore.put(jobId, new TranslationProgress(
                        jobId,
                        0,
                        "Translation failed",
                        true,
                        true,
                        e.getMessage(),
                        null));
            }
        });

        worker.start();

        return jobId;
    }

    public TranslationProgress getProgress(String jobId) {
        return progressStore.get(jobId);
    }

    public SubtitleTranslateResponse getAndTranslateSubtitlesWithProgress(String videoUrl, String targetLang,
            String jobId) {
        String videoId = extractYouTubeId(videoUrl);
        if (videoId == null || videoId.isBlank()) {
            throw new RuntimeException("Invalid YouTube URL");
        }

        updateProgress(jobId, 5, "Extracted YouTube video ID");

        TranscriptResult transcript = fetchTranscriptFromPython(videoId);

        updateProgress(jobId, 15, "Captions fetched successfully");

        if (transcript.items().isEmpty()) {
            throw new RuntimeException("Captions were fetched, but the transcript is empty.");
        }

        List<SubtitleLine> translated = new ArrayList<>();
        int totalLines = transcript.items().size();

        long startTime = System.currentTimeMillis();

        for (int i = 0; i < totalLines; i++) {
            SubtitleLine line = transcript.items().get(i);
            String translatedText = translateText(line.getText(), transcript.language(), targetLang);
            translated.add(new SubtitleLine(translatedText, line.getStart(), line.getDuration()));

            int loopProgress = 15 + (int) (((i + 1) / (double) totalLines) * 80.0);
            long elapsed = System.currentTimeMillis() - startTime;
            long avgTimePerLine = elapsed / (i + 1);
            long remainingMillis = (totalLines - i - 1L) * avgTimePerLine;

            updateProgress(
                    jobId,
                    loopProgress,
                    "Translating subtitles... " + (i + 1) + "/" + totalLines +
                            " (ETA " + (remainingMillis / 1000) + "s)");
        }

        updateProgress(jobId, 98, "Preparing response");

        return new SubtitleTranslateResponse(
                videoId,
                transcript.language(),
                targetLang,
                transcript.items(),
                translated);
    }

    private void updateProgress(String jobId, int progress, String message) {
        TranslationProgress current = progressStore.get(jobId);
        if (current != null) {
            TranslationProgress updated = new TranslationProgress(
                    jobId,
                    progress,
                    message,
                    current.isDone(),
                    current.isError(),
                    current.getErrorMessage(),
                    current.getResult());
            progressStore.put(jobId, updated);
        }

        System.out.println("JOB " + jobId + " -> " + progress + "% : " + message);
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
                        root.has("error") ? root.get("error").asText() : "Failed to fetch transcript");
            }

            String language = root.path("language").asText("auto");
            List<SubtitleLine> items = new ArrayList<>();

            for (JsonNode item : root.path("items")) {
                items.add(new SubtitleLine(
                        item.path("text").asText(),
                        item.path("start").asDouble(),
                        item.path("duration").asDouble()));
            }

            return new TranscriptResult(language, items);
        } catch (Exception e) {
            throw new RuntimeException("Transcript fetch failed: " + e.getMessage(), e);
        }
    }

    private String translateText(String text, String sourceLang, String targetLang) {
        try {
            String safeSource = normalizeLang(sourceLang);

            ObjectNode body = objectMapper.createObjectNode();
            body.put("q", text);
            body.put("source", safeSource);
            body.put("target", targetLang);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://127.0.0.1:5000/translate"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

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
            if (url == null)
                return null;

            if (url.contains("youtu.be/")) {
                String id = url.substring(url.indexOf("youtu.be/") + 9);
                int q = id.indexOf('?');
                if (q >= 0)
                    id = id.substring(0, q);
                return id;
            }

            if (url.contains("youtube.com/watch?v=")) {
                String id = url.substring(url.indexOf("v=") + 2);
                int amp = id.indexOf('&');
                if (amp >= 0)
                    id = id.substring(0, amp);
                return id;
            }

            if (url.contains("youtube.com/embed/")) {
                String id = url.substring(url.indexOf("embed/") + 6);
                int q = id.indexOf('?');
                if (q >= 0)
                    id = id.substring(0, q);
                return id;
            }

            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private record TranscriptResult(String language, List<SubtitleLine> items) {
    }
}