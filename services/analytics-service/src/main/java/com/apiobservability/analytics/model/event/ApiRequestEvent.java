package com.apiobservability.analytics.model.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiRequestEvent implements Serializable {
    private String eventId;
    private String apiId;
    private Integer statusCode;
    private Long responseTimeMs;
    private Boolean isViolation;
    private String method;
    private String error;
    private String timestamp;
}
