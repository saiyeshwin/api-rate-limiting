package com.apiobservability.analytics.controller;

import com.apiobservability.analytics.model.dto.AnalyticsSummaryDto;
import com.apiobservability.analytics.service.DlqManagementService;
import com.apiobservability.analytics.service.MetricsAggregationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final MetricsAggregationService metricsAggregationService;
    private final DlqManagementService dlqManagementService;

    @GetMapping("/summary")
    public ResponseEntity<AnalyticsSummaryDto> getAnalyticsSummary() {
        long dlqCount = dlqManagementService.getPendingCount();
        AnalyticsSummaryDto summary = metricsAggregationService.getSummary(dlqCount);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getServiceHealth() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "Analytics & Observability Microservice",
                "kafkaConsumerGroup", "analytics-service-group",
                "timestamp", System.currentTimeMillis()
        ));
    }
}
