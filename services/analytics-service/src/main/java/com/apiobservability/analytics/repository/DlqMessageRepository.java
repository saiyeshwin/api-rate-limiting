package com.apiobservability.analytics.repository;

import com.apiobservability.analytics.model.entity.DlqMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DlqMessageRepository extends JpaRepository<DlqMessage, UUID> {
    List<DlqMessage> findByStatus(String status);
    Page<DlqMessage> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    long countByStatus(String status);
}
