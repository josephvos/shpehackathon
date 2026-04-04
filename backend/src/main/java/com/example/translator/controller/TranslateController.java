package com.example.translator.controller;

import com.example.translator.dto.SubtitleTranslateRequest;
import com.example.translator.dto.SubtitleTranslateResponse;
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

    @PostMapping("/subtitles/translate")
    public ResponseEntity<SubtitleTranslateResponse> translateSubtitles(
            @RequestBody SubtitleTranslateRequest request
    ) {
        SubtitleTranslateResponse response =
                videoService.getAndTranslateSubtitles(request.getVideoUrl(), request.getTargetLang());

        return ResponseEntity.ok(response);
    }
}