package com.example.translator.controller;

import com.example.translator.dto.StartTranslationResponse;
import com.example.translator.dto.SubtitleTranslateRequest;
import com.example.translator.dto.TranslationProgress;
import com.example.translator.service.VideoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class TranslateController {

    private final VideoService videoService;

    public TranslateController(VideoService videoService) {
        this.videoService = videoService;
    }

    @PostMapping("/subtitles/translate/start")
    public ResponseEntity<StartTranslationResponse> startTranslation(
            @RequestBody SubtitleTranslateRequest request
    ) {
        String jobId = videoService.startTranslationJob(request);
        return ResponseEntity.ok(new StartTranslationResponse(jobId, "Translation started"));
    }

    @GetMapping("/subtitles/translate/progress/{jobId}")
    public ResponseEntity<TranslationProgress> getTranslationProgress(@PathVariable String jobId) {
        TranslationProgress progress = videoService.getProgress(jobId);

        if (progress == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(progress);
    }
}