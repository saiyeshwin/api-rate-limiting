package com.apiobservability.analytics.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsSummaryDto {
    private long totalRequests;
    private long totalViolations;
    private double p50LatencyMs;
    private double p90LatencyMs;
    private double p95LatencyMs;
    private double p99LatencyMs;
    private double avgLatencyMs;
    private long activeApisCount;
    private long healthyApisCount;
    private long dlqPendingCount;
    private Map<String, Long> statusDistribution;
}
