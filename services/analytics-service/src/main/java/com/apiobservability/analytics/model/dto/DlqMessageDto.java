package com.apiobservability.analytics.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DlqMessageDto {
    private UUID id;
    private String originalTopic;
    private String payload;
    private String errorMessage;
    private String stackTrace;
    private Integer retryCount;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime reprocessedAt;
}
