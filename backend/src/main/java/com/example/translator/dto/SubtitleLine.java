package com.example.translator.dto;

public class SubtitleLine {
    private String text;
    private double start;
    private double duration;

    public SubtitleLine() {}

    public SubtitleLine(String text, double start, double duration) {
        this.text = text;
        this.start = start;
        this.duration = duration;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public double getStart() {
        return start;
    }

    public void setStart(double start) {
        this.start = start;
    }

    public double getDuration() {
        return duration;
    }

    public void setDuration(double duration) {
        this.duration = duration;
    }
}