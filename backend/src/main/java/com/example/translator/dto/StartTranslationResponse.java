package com.example.translator.dto;

public class StartTranslationResponse {
    private String jobId;
    private String message;

    public StartTranslationResponse() {}

    public StartTranslationResponse(String jobId, String message) {
        this.jobId = jobId;
        this.message = message;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}