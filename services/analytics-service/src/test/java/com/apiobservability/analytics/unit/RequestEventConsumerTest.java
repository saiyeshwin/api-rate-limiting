package com.apiobservability.analytics.unit;

import com.apiobservability.analytics.consumer.RequestEventConsumer;
import com.apiobservability.analytics.model.event.ApiRequestEvent;
import com.apiobservability.analytics.service.DlqManagementService;
import com.apiobservability.analytics.service.IdempotencyService;
import com.apiobservability.analytics.service.MetricsAggregationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RequestEventConsumerTest {

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private MetricsAggregationService metricsAggregationService;

    @Mock
    private DlqManagementService dlqManagementService;

    @InjectMocks
    private RequestEventConsumer requestEventConsumer;

    @Test
    @DisplayName("Should process valid request event and update metrics when event is not duplicate")
    void shouldProcessValidEvent() {
        ApiRequestEvent event = ApiRequestEvent.builder()
                .eventId("evt-001")
                .apiId("api-001")
                .statusCode(200)
                .responseTimeMs(45L)
                .isViolation(false)
                .method("GET")
                .build();

        when(idempotencyService.tryAcquire("evt-001", "api.requests.raw", "analytics-service-group"))
                .thenReturn(true);

        requestEventConsumer.consumeRequestEvent(event, "api.requests.raw", "api-001");

        verify(idempotencyService, times(1)).tryAcquire("evt-001", "api.requests.raw", "analytics-service-group");
        verify(metricsAggregationService, times(1)).recordRequest(event);
    }

    @Test
    @DisplayName("Should skip event and avoid recording metrics when event is duplicate")
    void shouldSkipDuplicateEvent() {
        ApiRequestEvent event = ApiRequestEvent.builder()
                .eventId("evt-duplicate")
                .apiId("api-001")
                .statusCode(200)
                .responseTimeMs(45L)
                .build();

        when(idempotencyService.tryAcquire("evt-duplicate", "api.requests.raw", "analytics-service-group"))
                .thenReturn(false);

        requestEventConsumer.consumeRequestEvent(event, "api.requests.raw", "api-001");

        verify(idempotencyService, times(1)).tryAcquire("evt-duplicate", "api.requests.raw", "analytics-service-group");
        verify(metricsAggregationService, never()).recordRequest(any());
    }

    @Test
    @DisplayName("Should throw exception when poison pill is encountered to trigger retry / DLQ sequence")
    void shouldThrowExceptionOnPoisonPill() {
        ApiRequestEvent poisonEvent = ApiRequestEvent.builder()
                .eventId("evt-poison")
                .apiId("POISON_PILL")
                .statusCode(500)
                .build();

        assertThatThrownBy(() -> requestEventConsumer.consumeRequestEvent(poisonEvent, "api.requests.raw", "POISON_PILL"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Fatal error processing poison pill event");

        verify(metricsAggregationService, never()).recordRequest(any());
    }

    @Test
    @DisplayName("Should route to DLQ service when handleDlt is invoked")
    void shouldRouteToDlqServiceOnHandleDlt() {
        String payload = "{\"eventId\":\"evt-fail\",\"apiId\":\"POISON_PILL\"}";

        requestEventConsumer.handleDlt(
                payload,
                "api.requests.raw.dlq",
                "api.requests.raw",
                "Connection timeout after 3 attempts",
                "java.lang.IllegalArgumentException at com..."
        );

        verify(dlqManagementService, times(1)).recordFailure(
                eq("api.requests.raw"),
                eq(payload),
                eq("Connection timeout after 3 attempts"),
                eq("java.lang.IllegalArgumentException at com..."),
                eq(3)
        );
    }
}
