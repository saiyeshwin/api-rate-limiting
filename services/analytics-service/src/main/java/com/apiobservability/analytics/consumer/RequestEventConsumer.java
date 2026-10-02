package com.apiobservability.analytics.consumer;

import com.apiobservability.analytics.model.event.ApiRequestEvent;
import com.apiobservability.analytics.service.DlqManagementService;
import com.apiobservability.analytics.service.IdempotencyService;
import com.apiobservability.analytics.service.MetricsAggregationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.DltStrategy;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RequestEventConsumer {

    private final IdempotencyService idempotencyService;
    private final MetricsAggregationService metricsAggregationService;
    private final DlqManagementService dlqManagementService;

    /**
     * Consumes incoming raw request events with non-blocking retry topics and DLQ fallback.
     * Retries 3 times with exponential backoff before sending to Dead Letter Queue (DLQ).
     */
    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 1000, multiplier = 2.0),
            dltStrategy = DltStrategy.FAIL_ON_ERROR,
            dltTopicSuffix = ".dlq"
    )
    @KafkaListener(
            topics = "${app.kafka.topics.requests-raw:api.requests.raw}",
            groupId = "${spring.kafka.consumer.group-id:analytics-service-group}"
    )
    public void consumeRequestEvent(
            @Payload ApiRequestEvent event,
            @Header(value = KafkaHeaders.RECEIVED_TOPIC, defaultValue = "api.requests.raw") String topic,
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key
    ) {
        log.debug("[Kafka Consumer] Received request event: eventId={}, apiId={}, status={}", 
                event.getEventId(), event.getApiId(), event.getStatusCode());

        // 1. Poison Pill / Malformed check to trigger retry/DLQ test scenario if requested
        if ("POISON_PILL".equals(event.getApiId())) {
            log.error("[Kafka Consumer] Poison pill detected in eventId={}. Triggering retry / DLQ sequence.", event.getEventId());
            throw new IllegalArgumentException("Fatal error processing poison pill event: " + event.getEventId());
        }

        // 2. Idempotency Check & Lock
        boolean acquired = idempotencyService.tryAcquire(event.getEventId(), topic, "analytics-service-group");
        if (!acquired) {
            log.info("[Kafka Consumer] Skipping already processed duplicate event: {}", event.getEventId());
            return;
        }

        // 3. Process & Aggregate Metric
        metricsAggregationService.recordRequest(event);
    }

    /**
     * DLT (Dead Letter Topic) Handler called when all retry attempts are exhausted.
     */
    @DltHandler
    public void handleDlt(
            @Payload String rawPayload,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String dlqTopic,
            @Header(value = KafkaHeaders.ORIGINAL_TOPIC, defaultValue = "api.requests.raw") String originalTopic,
            @Header(value = KafkaHeaders.EXCEPTION_MESSAGE, defaultValue = "Exhausted retries") String exceptionMessage,
            @Header(value = KafkaHeaders.EXCEPTION_STACKTRACE, defaultValue = "") String stackTrace
    ) {
        log.error("[DLT Handler] Routing message to DLQ table. Original topic={}, DLQ topic={}, error={}",
                originalTopic, dlqTopic, exceptionMessage);

        dlqManagementService.recordFailure(
                originalTopic,
                rawPayload,
                exceptionMessage,
                stackTrace,
                3 // max retries
        );
    }
}
