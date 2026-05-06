package com.example.demo.repository;

import com.example.demo.model.Communication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommunicationRepository extends JpaRepository<Communication, Long> {
    List<Communication> findByIncidentIdOrderByCreatedAtDesc(Long incidentId);
    List<Communication> findByReadStatus(Boolean readStatus);
    List<Communication> findByIncidentIdIsNullAndType(String type);
}
