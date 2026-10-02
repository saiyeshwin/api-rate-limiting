package com.apiobservability.analytics.unit;

import com.apiobservability.analytics.model.dto.AnalyticsSummaryDto;
import com.apiobservability.analytics.model.event.ApiRequestEvent;
import com.apiobservability.analytics.model.event.HealthCheckEvent;
import com.apiobservability.analytics.model.event.RateLimitViolationEvent;
import com.apiobservability.analytics.service.MetricsAggregationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MetricsAggregationServiceTest {

    private MetricsAggregationService metricsService;

    @BeforeEach
    void setUp() {
        metricsService = new MetricsAggregationService();
        metricsService.reset();
    }

    @Test
    @DisplayName("Should record normal requests and calculate accurate percentile latencies")
    void shouldRecordRequestsAndCalculatePercentiles() {
        // Record requests with latencies: 10ms, 20ms, 30ms, 40ms, 100ms
        long[] latencies = {10L, 20L, 30L, 40L, 100L};
        for (long latency : latencies) {
            metricsService.recordRequest(ApiRequestEvent.builder()
                    .eventId("evt-" + latency)
                    .apiId("api-01")
                    .statusCode(200)
                    .responseTimeMs(latency)
                    .isViolation(false)
                    .build());
        }

        AnalyticsSummaryDto summary = metricsService.getSummary(0);

        assertThat(summary.getTotalRequests()).isEqualTo(5);
        assertThat(summary.getTotalViolations()).isEqualTo(0);
        assertThat(summary.getAvgLatencyMs()).isEqualTo(40.0);
        assertThat(summary.getP50LatencyMs()).isEqualTo(30.0);
        assertThat(summary.getP90LatencyMs()).isEqualTo(100.0);
        assertThat(summary.getP99LatencyMs()).isEqualTo(100.0);
        assertThat(summary.getStatusDistribution().get("2xx")).isEqualTo(5L);
        assertThat(summary.getStatusDistribution().get("200")).isEqualTo(5L);
    }

    @Test
    @DisplayName("Should record 429 rate limit violation events accurately")
    void shouldRecordRateLimitViolations() {
        metricsService.recordRequest(ApiRequestEvent.builder()
                .eventId("evt-norm")
                .statusCode(200)
                .responseTimeMs(15L)
                .isViolation(false)
                .build());

        metricsService.recordRequest(ApiRequestEvent.builder()
                .eventId("evt-429")
                .statusCode(429)
                .responseTimeMs(0L)
                .isViolation(true)
                .build());

        metricsService.recordViolation(RateLimitViolationEvent.builder()
                .eventId("evt-violation-event")
                .apiId("api-01")
                .limit(60)
                .windowSec(60)
                .build());

        AnalyticsSummaryDto summary = metricsService.getSummary(2);

        assertThat(summary.getTotalRequests()).isEqualTo(2);
        assertThat(summary.getTotalViolations()).isEqualTo(2); // 1 from request 429 + 1 from violation event
        assertThat(summary.getDlqPendingCount()).isEqualTo(2);
        assertThat(summary.getStatusDistribution().get("429")).isNotNull();
    }

    @Test
    @DisplayName("Should track healthy vs unhealthy APIs")
    void shouldTrackApiHealthStates() {
        metricsService.recordHealthCheck(HealthCheckEvent.builder()
                .apiId("api-1")
                .isHealthy(true)
                .statusCode(200)
                .build());

        metricsService.recordHealthCheck(HealthCheckEvent.builder()
                .apiId("api-2")
                .isHealthy(false)
                .statusCode(503)
                .build());

        AnalyticsSummaryDto summary = metricsService.getSummary(0);

        assertThat(summary.getActiveApisCount()).isEqualTo(2);
        assertThat(summary.getHealthyApisCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should compute percentile on empty or single item gracefully")
    void shouldHandleEdgeCasePercentiles() {
        assertThat(metricsService.calculatePercentile(List.of(), 95)).isEqualTo(0.0);
        assertThat(metricsService.calculatePercentile(List.of(42L), 95)).isEqualTo(42.0);
    }
}
