package com.apiobservability.analytics.service;

import com.apiobservability.analytics.model.entity.ProcessedEvent;
import com.apiobservability.analytics.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

    private final ProcessedEventRepository processedEventRepository;

    /**
     * Checks if the event was already processed.
     */
    @Transactional(readOnly = true)
    public boolean isProcessed(String eventId) {
        if (eventId == null || eventId.trim().isEmpty()) {
            return false;
        }
        return processedEventRepository.existsByEventId(eventId);
    }

    /**
     * Atomically tries to acquire event lock by inserting a record into processed_events table.
     * Returns true if newly acquired (not duplicate), false if already processed.
     */
    @Transactional
    public boolean tryAcquire(String eventId, String topic, String consumerGroup) {
        if (eventId == null || eventId.trim().isEmpty()) {
            return true; // Unidentified events proceed without deduplication
        }

        try {
            if (processedEventRepository.existsByEventId(eventId)) {
                log.info("[Idempotency] Duplicate event detected and suppressed: eventId={}, topic={}", eventId, topic);
                return false;
            }

            ProcessedEvent event = ProcessedEvent.builder()
                    .eventId(eventId)
                    .topic(topic)
                    .consumerGroup(consumerGroup != null ? consumerGroup : "analytics-service-group")
                    .processedAt(LocalDateTime.now())
                    .build();

            processedEventRepository.saveAndFlush(event);
            return true;
        } catch (DataIntegrityViolationException e) {
            log.info("[Idempotency] Concurrent duplicate event caught: eventId={}", eventId);
            return false;
        } catch (Exception e) {
            log.warn("[Idempotency] Error checking idempotency key {}: {}", eventId, e.getMessage());
            return true; // Fail open to avoid dropping messages on transient DB issues
        }
    }

    /**
     * Marks an event as processed.
     */
    @Transactional
    public void markProcessed(String eventId, String topic, String consumerGroup) {
        if (eventId == null || eventId.trim().isEmpty()) return;

        ProcessedEvent event = ProcessedEvent.builder()
                .eventId(eventId)
                .topic(topic)
                .consumerGroup(consumerGroup != null ? consumerGroup : "analytics-service-group")
                .processedAt(LocalDateTime.now())
                .build();
        processedEventRepository.save(event);
    }
}
