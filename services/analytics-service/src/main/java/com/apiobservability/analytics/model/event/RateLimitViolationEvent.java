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
public class RateLimitViolationEvent implements Serializable {
    private String eventId;
    private String apiId;
    private String keyPrefix;
    private Integer limit;
    private Integer windowSec;
    private String strategy;
    private String timestamp;
}
