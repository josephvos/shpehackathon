package com.example.translator.dto;

import java.util.List;

public class SubtitleTranslateResponse {
    private String videoId;
    private String sourceLang;
    private String targetLang;
    private List<SubtitleLine> originalSubtitles;
    private List<SubtitleLine> translatedSubtitles;

    public SubtitleTranslateResponse() {}

    public SubtitleTranslateResponse(
            String videoId,
            String sourceLang,
            String targetLang,
            List<SubtitleLine> originalSubtitles,
            List<SubtitleLine> translatedSubtitles
    ) {
        this.videoId = videoId;
        this.sourceLang = sourceLang;
        this.targetLang = targetLang;
        this.originalSubtitles = originalSubtitles;
        this.translatedSubtitles = translatedSubtitles;
    }

    public String getVideoId() {
        return videoId;
    }

    public void setVideoId(String videoId) {
        this.videoId = videoId;
    }

    public String getSourceLang() {
        return sourceLang;
    }

    public void setSourceLang(String sourceLang) {
        this.sourceLang = sourceLang;
    }

    public String getTargetLang() {
        return targetLang;
    }

    public void setTargetLang(String targetLang) {
        this.targetLang = targetLang;
    }

    public List<SubtitleLine> getOriginalSubtitles() {
        return originalSubtitles;
    }

    public void setOriginalSubtitles(List<SubtitleLine> originalSubtitles) {
        this.originalSubtitles = originalSubtitles;
    }

    public List<SubtitleLine> getTranslatedSubtitles() {
        return translatedSubtitles;
    }

    public void setTranslatedSubtitles(List<SubtitleLine> translatedSubtitles) {
        this.translatedSubtitles = translatedSubtitles;
    }
}