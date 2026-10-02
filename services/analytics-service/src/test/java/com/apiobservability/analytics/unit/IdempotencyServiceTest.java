package com.apiobservability.analytics.unit;

import com.apiobservability.analytics.model.entity.ProcessedEvent;
import com.apiobservability.analytics.repository.ProcessedEventRepository;
import com.apiobservability.analytics.service.IdempotencyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IdempotencyServiceTest {

    @Mock
    private ProcessedEventRepository processedEventRepository;

    @InjectMocks
    private IdempotencyService idempotencyService;

    private final String eventId = "evt-12345-uuid";
    private final String topic = "api.requests.raw";
    private final String group = "analytics-service-group";

    @Test
    @DisplayName("Should acquire lock successfully for new, unseen event ID")
    void shouldAcquireLockForNewEvent() {
        when(processedEventRepository.existsByEventId(eventId)).thenReturn(false);
        when(processedEventRepository.saveAndFlush(any(ProcessedEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        boolean acquired = idempotencyService.tryAcquire(eventId, topic, group);

        assertThat(acquired).isTrue();
        verify(processedEventRepository, times(1)).existsByEventId(eventId);
        verify(processedEventRepository, times(1)).saveAndFlush(any(ProcessedEvent.class));
    }

    @Test
    @DisplayName("Should reject and suppress duplicate event when event ID already exists")
    void shouldRejectDuplicateEventWhenAlreadyExists() {
        when(processedEventRepository.existsByEventId(eventId)).thenReturn(true);

        boolean acquired = idempotencyService.tryAcquire(eventId, topic, group);

        assertThat(acquired).isFalse();
        verify(processedEventRepository, times(1)).existsByEventId(eventId);
        verify(processedEventRepository, never()).saveAndFlush(any(ProcessedEvent.class));
    }

    @Test
    @DisplayName("Should handle concurrent duplicate insertion gracefully via DataIntegrityViolationException")
    void shouldHandleConcurrentDuplicateGracefully() {
        when(processedEventRepository.existsByEventId(eventId)).thenReturn(false);
        when(processedEventRepository.saveAndFlush(any(ProcessedEvent.class)))
                .thenThrow(new DataIntegrityViolationException("Duplicate primary key"));

        boolean acquired = idempotencyService.tryAcquire(eventId, topic, group);

        assertThat(acquired).isFalse();
    }

    @Test
    @DisplayName("Should allow null or blank event IDs without throwing exception")
    void shouldAllowNullOrBlankEventIds() {
        assertThat(idempotencyService.tryAcquire(null, topic, group)).isTrue();
        assertThat(idempotencyService.tryAcquire("", topic, group)).isTrue();
        assertThat(idempotencyService.tryAcquire("   ", topic, group)).isTrue();
        verify(processedEventRepository, never()).existsByEventId(any());
    }

    @Test
    @DisplayName("Should check isProcessed correctly")
    void shouldCheckIsProcessedCorrectly() {
        when(processedEventRepository.existsByEventId(eventId)).thenReturn(true);
        when(processedEventRepository.existsByEventId("other-id")).thenReturn(false);

        assertThat(idempotencyService.isProcessed(eventId)).isTrue();
        assertThat(idempotencyService.isProcessed("other-id")).isFalse();
        assertThat(idempotencyService.isProcessed(null)).isFalse();
    }
}
