package com.apiobservability.analytics.unit;

import com.apiobservability.analytics.model.dto.DlqMessageDto;
import com.apiobservability.analytics.model.entity.DlqMessage;
import com.apiobservability.analytics.repository.DlqMessageRepository;
import com.apiobservability.analytics.service.DlqManagementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DlqManagementServiceTest {

    @Mock
    private DlqMessageRepository dlqMessageRepository;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks
    private DlqManagementService dlqManagementService;

    @Test
    @DisplayName("Should record failure in DLQ repository with FAILED status")
    void shouldRecordFailureInDlq() {
        DlqMessage saved = DlqMessage.builder()
                .id(UUID.randomUUID())
                .originalTopic("api.requests.raw")
                .payload("{\"test\":true}")
                .errorMessage("NullPointerException")
                .stackTrace("stacktrace...")
                .retryCount(3)
                .status("FAILED")
                .createdAt(LocalDateTime.now())
                .build();

        when(dlqMessageRepository.save(any(DlqMessage.class))).thenReturn(saved);

        DlqMessage result = dlqManagementService.recordFailure(
                "api.requests.raw",
                "{\"test\":true}",
                "NullPointerException",
                "stacktrace...",
                3
        );

        assertThat(result.getId()).isNotNull();
        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(result.getOriginalTopic()).isEqualTo("api.requests.raw");
        verify(dlqMessageRepository, times(1)).save(any(DlqMessage.class));
    }

    @Test
    @DisplayName("Should fetch pending DLQ messages successfully")
    void shouldFetchPendingMessages() {
        DlqMessage msg = DlqMessage.builder()
                .id(UUID.randomUUID())
                .originalTopic("api.requests.raw")
                .payload("{}")
                .status("FAILED")
                .build();

        when(dlqMessageRepository.findByStatusOrderByCreatedAtDesc(eq("FAILED"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(msg)));

        List<DlqMessageDto> dtos = dlqManagementService.getPendingMessages(0, 10);

        assertThat(dtos).hasSize(1);
        assertThat(dtos.get(0).getId()).isEqualTo(msg.getId());
    }

    @Test
    @DisplayName("Should reprocess DLQ message and republish to original topic")
    void shouldReprocessDlqMessage() {
        UUID id = UUID.randomUUID();
        DlqMessage msg = DlqMessage.builder()
                .id(id)
                .originalTopic("api.requests.raw")
                .payload("{\"eventId\":\"evt-reprocess\"}")
                .status("FAILED")
                .build();

        when(dlqMessageRepository.findById(id)).thenReturn(Optional.of(msg));

        boolean success = dlqManagementService.reprocessMessage(id);

        assertThat(success).isTrue();
        assertThat(msg.getStatus()).isEqualTo("REPROCESSED");
        assertThat(msg.getReprocessedAt()).isNotNull();
        verify(kafkaTemplate, times(1)).send("api.requests.raw", "{\"eventId\":\"evt-reprocess\"}");
        verify(dlqMessageRepository, times(1)).save(msg);
    }

    @Test
    @DisplayName("Should discard DLQ message")
    void shouldDiscardDlqMessage() {
        UUID id = UUID.randomUUID();
        DlqMessage msg = DlqMessage.builder()
                .id(id)
                .originalTopic("api.requests.raw")
                .status("FAILED")
                .build();

        when(dlqMessageRepository.findById(id)).thenReturn(Optional.of(msg));

        boolean success = dlqManagementService.discardMessage(id);

        assertThat(success).isTrue();
        assertThat(msg.getStatus()).isEqualTo("DISCARDED");
        verify(dlqMessageRepository, times(1)).save(msg);
    }
}
