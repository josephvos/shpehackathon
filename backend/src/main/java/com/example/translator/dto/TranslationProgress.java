package com.example.translator.dto;

public class TranslationProgress {
    private String jobId;
    private int progress;
    private String message;
    private boolean done;
    private boolean error;
    private String errorMessage;
    private SubtitleTranslateResponse result;

    public TranslationProgress() {}

    public TranslationProgress(String jobId, int progress, String message, boolean done, boolean error, String errorMessage, SubtitleTranslateResponse result) {
        this.jobId = jobId;
        this.progress = progress;
        this.message = message;
        this.done = done;
        this.error = error;
        this.errorMessage = errorMessage;
        this.result = result;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isDone() {
        return done;
    }

    public void setDone(boolean done) {
        this.done = done;
    }

    public boolean isError() {
        return error;
    }

    public void setError(boolean error) {
        this.error = error;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public SubtitleTranslateResponse getResult() {
        return result;
    }

    public void setResult(SubtitleTranslateResponse result) {
        this.result = result;
    }
}