package com.example.demo.repository;

import com.example.demo.model.Personnel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PersonnelRepository extends JpaRepository<Personnel, Long> {
    List<Personnel> findByAssignedIncidentId(Long incidentId);
}
