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
public class HealthCheckEvent implements Serializable {
    private String eventId;
    private String apiId;
    private String apiName;
    private String endpoint;
    private Integer statusCode;
    private Long responseTimeMs;
    private Boolean isHealthy;
    private String errorMessage;
    private String timestamp;
}
