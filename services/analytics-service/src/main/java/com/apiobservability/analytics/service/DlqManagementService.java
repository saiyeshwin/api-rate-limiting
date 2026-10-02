package com.apiobservability.analytics.service;

import com.apiobservability.analytics.model.dto.DlqMessageDto;
import com.apiobservability.analytics.model.entity.DlqMessage;
import com.apiobservability.analytics.repository.DlqMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DlqManagementService {

    private final DlqMessageRepository dlqMessageRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Persist a failed message to the Dead Letter Queue database table.
     */
    @Transactional
    public DlqMessage recordFailure(String originalTopic, String payload, String errorMessage, String stackTrace, int retryCount) {
        DlqMessage dlqMessage = DlqMessage.builder()
                .originalTopic(originalTopic)
                .payload(payload)
                .errorMessage(errorMessage)
                .stackTrace(stackTrace)
                .retryCount(retryCount)
                .status("FAILED")
                .createdAt(LocalDateTime.now())
                .build();

        DlqMessage saved = dlqMessageRepository.save(dlqMessage);
        log.warn("[DLQ] Recorded message in DLQ table: id={}, originalTopic={}, error={}", saved.getId(), originalTopic, errorMessage);
        return saved;
    }

    /**
     * Get paginated DLQ messages.
     */
    @Transactional(readOnly = true)
    public List<DlqMessageDto> getPendingMessages(int page, int size) {
        Page<DlqMessage> paged = dlqMessageRepository.findByStatusOrderByCreatedAtDesc("FAILED", PageRequest.of(page, size));
        return paged.getContent().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getPendingCount() {
        return dlqMessageRepository.countByStatus("FAILED");
    }

    /**
     * Replay a message from DLQ back into the original Kafka topic for reprocessing.
     */
    @Transactional
    public boolean reprocessMessage(UUID id) {
        Optional<DlqMessage> optionalMessage = dlqMessageRepository.findById(id);
        if (optionalMessage.isEmpty()) {
            return false;
        }

        DlqMessage message = optionalMessage.get();
        try {
            // Re-publish to original topic
            kafkaTemplate.send(message.getOriginalTopic(), message.getPayload());

            message.setStatus("REPROCESSED");
            message.setReprocessedAt(LocalDateTime.now());
            dlqMessageRepository.save(message);

            log.info("[DLQ] Successfully requeued DLQ message id={} back to topic={}", id, message.getOriginalTopic());
            return true;
        } catch (Exception e) {
            log.error("[DLQ] Failed to reprocess message id={}: {}", id, e.getMessage());
            return false;
        }
    }

    /**
     * Discard a message from active DLQ.
     */
    @Transactional
    public boolean discardMessage(UUID id) {
        Optional<DlqMessage> optionalMessage = dlqMessageRepository.findById(id);
        if (optionalMessage.isEmpty()) {
            return false;
        }

        DlqMessage message = optionalMessage.get();
        message.setStatus("DISCARDED");
        dlqMessageRepository.save(message);
        log.info("[DLQ] Marked DLQ message id={} as DISCARDED", id);
        return true;
    }

    private DlqMessageDto toDto(DlqMessage entity) {
        return DlqMessageDto.builder()
                .id(entity.getId())
                .originalTopic(entity.getOriginalTopic())
                .payload(entity.getPayload())
                .errorMessage(entity.getErrorMessage())
                .stackTrace(entity.getStackTrace())
                .retryCount(entity.getRetryCount())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .reprocessedAt(entity.getReprocessedAt())
                .build();
    }
}
