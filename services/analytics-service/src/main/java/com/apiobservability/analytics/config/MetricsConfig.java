package com.apiobservability.analytics.config;

import com.apiobservability.analytics.service.DlqManagementService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MetricsConfig {

    @Bean
    public Counter eventsConsumedCounter(MeterRegistry registry) {
        return Counter.builder("analytics.events.consumed")
                .description("Total number of Kafka events consumed by analytics microservice")
                .tag("service", "analytics-service")
                .register(registry);
    }

    @Bean
    public Counter duplicateEventsCounter(MeterRegistry registry) {
        return Counter.builder("analytics.idempotency.duplicates")
                .description("Total number of duplicate Kafka events suppressed by idempotency engine")
                .tag("service", "analytics-service")
                .register(registry);
    }

    @Bean
    public Counter dlqMessagesRecordedCounter(MeterRegistry registry) {
        return Counter.builder("analytics.dlq.recorded")
                .description("Total number of failed messages routed to the Dead Letter Queue")
                .tag("service", "analytics-service")
                .register(registry);
    }

    @Bean
    public Timer eventProcessingTimer(MeterRegistry registry) {
        return Timer.builder("analytics.event.processing.time")
                .description("Time taken to process and record analytical events")
                .tag("service", "analytics-service")
                .publishPercentileHistogram()
                .register(registry);
    }

    @Bean
    public Gauge dlqPendingGauge(MeterRegistry registry, DlqManagementService dlqManagementService) {
        return Gauge.builder("analytics.dlq.pending.count", dlqManagementService, DlqManagementService::getPendingCount)
                .description("Current number of active pending messages in the Dead Letter Queue")
                .tag("service", "analytics-service")
                .register(registry);
    }
}
