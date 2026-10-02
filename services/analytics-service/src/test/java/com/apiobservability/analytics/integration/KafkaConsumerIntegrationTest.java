package com.apiobservability.analytics.integration;

import com.apiobservability.analytics.model.dto.AnalyticsSummaryDto;
import com.apiobservability.analytics.model.event.ApiRequestEvent;
import com.apiobservability.analytics.repository.ProcessedEventRepository;
import com.apiobservability.analytics.service.MetricsAggregationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@EmbeddedKafka(
        partitions = 1,
        topics = {
                "${app.kafka.topics.requests-raw:test.api.requests.raw}",
                "${app.kafka.topics.health-checks:test.api.health.checks}",
                "${app.kafka.topics.requests-dlq:test.api.requests.dlq}"
        }
)
@DirtiesContext
class KafkaConsumerIntegrationTest {

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private ProcessedEventRepository processedEventRepository;

    @Autowired
    private MetricsAggregationService metricsAggregationService;

    @Value("${app.kafka.topics.requests-raw:test.api.requests.raw}")
    private String requestsTopic;

    @Test
    @DisplayName("Integration Test: End-to-End Event Ingestion, Idempotency Deduplication, and Metrics Aggregation")
    void testEndToEndEventProcessingAndIdempotency() {
        String eventId = "integ-" + UUID.randomUUID();
        ApiRequestEvent requestEvent = ApiRequestEvent.builder()
                .eventId(eventId)
                .apiId("api-test-integ")
                .statusCode(200)
                .responseTimeMs(55L)
                .isViolation(false)
                .method("GET")
                .timestamp(String.valueOf(System.currentTimeMillis()))
                .build();

        // 1. Publish first event to Kafka
        kafkaTemplate.send(requestsTopic, eventId, requestEvent);

        // 2. Await consumption and persistence in processed_events table
        await().atMost(10, TimeUnit.SECONDS).untilAsserted(() -> {
            assertThat(processedEventRepository.existsByEventId(eventId)).isTrue();
        });

        AnalyticsSummaryDto initialSummary = metricsAggregationService.getSummary(0);
        long initialCount = initialSummary.getTotalRequests();
        assertThat(initialCount).isGreaterThanOrEqualTo(1);

        // 3. Publish duplicate event with identical eventId to test Idempotency
        kafkaTemplate.send(requestsTopic, eventId, requestEvent);

        // 4. Wait briefly to confirm duplicate was rejected and total requests count did NOT double for this eventId
        try {
            Thread.sleep(1500);
        } catch (InterruptedException ignored) {}

        AnalyticsSummaryDto afterDuplicateSummary = metricsAggregationService.getSummary(0);
        assertThat(afterDuplicateSummary.getTotalRequests()).isEqualTo(initialCount);
    }
}
