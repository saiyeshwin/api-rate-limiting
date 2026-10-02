package com.apiobservability.analytics.controller;

import com.apiobservability.analytics.model.dto.DlqMessageDto;
import com.apiobservability.analytics.service.DlqManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/analytics/dlq")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DlqController {

    private final DlqManagementService dlqManagementService;

    @GetMapping("/messages")
    public ResponseEntity<List<DlqMessageDto>> getPendingDlqMessages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        List<DlqMessageDto> messages = dlqManagementService.getPendingMessages(page, size);
        return ResponseEntity.ok(messages);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDlqStats() {
        long count = dlqManagementService.getPendingCount();
        return ResponseEntity.ok(Map.of(
                "pendingCount", count,
                "status", count == 0 ? "HEALTHY" : "ATTENTION_REQUIRED"
        ));
    }

    @PostMapping("/reprocess/{id}")
    public ResponseEntity<Map<String, Object>> reprocessDlqMessage(@PathVariable UUID id) {
        boolean success = dlqManagementService.reprocessMessage(id);
        if (success) {
            return ResponseEntity.ok(Map.of("message", "Message re-published to original Kafka topic", "id", id));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to reprocess message or message not found", "id", id));
        }
    }

    @PostMapping("/discard/{id}")
    public ResponseEntity<Map<String, Object>> discardDlqMessage(@PathVariable UUID id) {
        boolean success = dlqManagementService.discardMessage(id);
        if (success) {
            return ResponseEntity.ok(Map.of("message", "Message discarded", "id", id));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Message not found", "id", id));
        }
    }
}
