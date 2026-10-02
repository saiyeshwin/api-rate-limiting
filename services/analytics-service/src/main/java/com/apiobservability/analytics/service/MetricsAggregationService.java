package com.apiobservability.analytics.service;

import com.apiobservability.analytics.model.dto.AnalyticsSummaryDto;
import com.apiobservability.analytics.model.event.ApiRequestEvent;
import com.apiobservability.analytics.model.event.HealthCheckEvent;
import com.apiobservability.analytics.model.event.RateLimitViolationEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@Slf4j
public class MetricsAggregationService {

    private final AtomicLong totalRequests = new AtomicLong(0);
    private final AtomicLong totalViolations = new AtomicLong(0);
    private final ConcurrentHashMap<String, AtomicLong> statusCodes = new ConcurrentHashMap<>();
    private final ConcurrentLinkedDeque<Long> recentLatencies = new ConcurrentLinkedDeque<>();
    private final ConcurrentHashMap<String, Boolean> apiHealthStates = new ConcurrentHashMap<>();
    private static final int MAX_LATENCY_SAMPLES = 5000;

    /**
     * Record an incoming raw request event.
     */
    public void recordRequest(ApiRequestEvent event) {
        totalRequests.incrementAndGet();

        if (Boolean.TRUE.equals(event.getIsViolation()) || (event.getStatusCode() != null && event.getStatusCode() == 429)) {
            totalViolations.incrementAndGet();
        }

        if (event.getStatusCode() != null) {
            String statusCategory = (event.getStatusCode() / 100) + "xx";
            statusCodes.computeIfAbsent(statusCategory, k -> new AtomicLong(0)).incrementAndGet();
            statusCodes.computeIfAbsent(String.valueOf(event.getStatusCode()), k -> new AtomicLong(0)).incrementAndGet();
        }

        if (event.getResponseTimeMs() != null && event.getResponseTimeMs() >= 0) {
            recentLatencies.addLast(event.getResponseTimeMs());
            while (recentLatencies.size() > MAX_LATENCY_SAMPLES) {
                recentLatencies.pollFirst();
            }
        }
    }

    /**
     * Record a rate limit violation event.
     */
    public void recordViolation(RateLimitViolationEvent event) {
        totalViolations.incrementAndGet();
        statusCodes.computeIfAbsent("429", k -> new AtomicLong(0)).incrementAndGet();
        statusCodes.computeIfAbsent("4xx", k -> new AtomicLong(0)).incrementAndGet();
    }

    /**
     * Record a health check result.
     */
    public void recordHealthCheck(HealthCheckEvent event) {
        if (event.getApiId() != null && event.getIsHealthy() != null) {
            apiHealthStates.put(event.getApiId(), event.getIsHealthy());
        }
    }

    /**
     * Compute current aggregated analytics and percentile latencies.
     */
    public AnalyticsSummaryDto getSummary(long dlqPendingCount) {
        List<Long> latencies = new ArrayList<>(recentLatencies);
        Collections.sort(latencies);

        double avgLatency = latencies.isEmpty() ? 0.0 : latencies.stream().mapToLong(Long::longValue).average().orElse(0.0);
        double p50 = calculatePercentile(latencies, 50);
        double p90 = calculatePercentile(latencies, 90);
        double p95 = calculatePercentile(latencies, 95);
        double p99 = calculatePercentile(latencies, 99);

        Map<String, Long> statusMap = statusCodes.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().get()));

        long healthyCount = apiHealthStates.values().stream().filter(Boolean::booleanValue).count();

        return AnalyticsSummaryDto.builder()
                .totalRequests(totalRequests.get())
                .totalViolations(totalViolations.get())
                .avgLatencyMs(Math.round(avgLatency * 10.0) / 10.0)
                .p50LatencyMs(p50)
                .p90LatencyMs(p90)
                .p95LatencyMs(p95)
                .p99LatencyMs(p99)
                .activeApisCount(apiHealthStates.size())
                .healthyApisCount(healthyCount)
                .dlqPendingCount(dlqPendingCount)
                .statusDistribution(statusMap)
                .build();
    }

    public double calculatePercentile(List<Long> sortedList, double percentile) {
        if (sortedList == null || sortedList.isEmpty()) {
            return 0.0;
        }
        if (sortedList.size() == 1) {
            return sortedList.get(0).doubleValue();
        }
        int index = (int) Math.ceil((percentile / 100.0) * sortedList.size()) - 1;
        index = Math.max(0, Math.min(index, sortedList.size() - 1));
        return sortedList.get(index).doubleValue();
    }

    public void reset() {
        totalRequests.set(0);
        totalViolations.set(0);
        statusCodes.clear();
        recentLatencies.clear();
        apiHealthStates.clear();
    }
}
