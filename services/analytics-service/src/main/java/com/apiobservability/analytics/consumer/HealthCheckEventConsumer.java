package com.apiobservability.analytics.consumer;

import com.apiobservability.analytics.model.event.HealthCheckEvent;
import com.apiobservability.analytics.service.IdempotencyService;
import com.apiobservability.analytics.service.MetricsAggregationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
public class HealthCheckEventConsumer {

    private final IdempotencyService idempotencyService;
    private final MetricsAggregationService metricsAggregationService;

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 1000, multiplier = 2.0),
            dltStrategy = DltStrategy.FAIL_ON_ERROR,
            dltTopicSuffix = ".dlq"
    )
    @KafkaListener(
            topics = "${app.kafka.topics.health-checks:api.health.checks}",
            groupId = "${spring.kafka.consumer.group-id:analytics-service-group}"
    )
    public void consumeHealthCheckEvent(
            @Payload HealthCheckEvent event,
            @Header(value = KafkaHeaders.RECEIVED_TOPIC, defaultValue = "api.health.checks") String topic
    ) {
        log.debug("[Kafka Consumer] Received health check: apiId={}, isHealthy={}", event.getApiId(), event.getIsHealthy());

        // Idempotency check
        boolean acquired = idempotencyService.tryAcquire(event.getEventId(), topic, "analytics-service-group");
        if (!acquired) {
            log.info("[Kafka Consumer] Skipping duplicate health check event: {}", event.getEventId());
            return;
        }

        metricsAggregationService.recordHealthCheck(event);
    }
}
