package com.example.demo.controller;

import com.example.demo.repository.IncidentRepository;
import com.example.demo.repository.PersonnelRepository;
import com.example.demo.repository.ResourceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private PersonnelRepository personnelRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardAnalytics() {
        return ResponseEntity.ok(Map.of(
            "success", true,
            "analytics", Map.of(
                "total_incidents", incidentRepository.count(),
                "active_incidents", incidentRepository.findByStatus("active").size(),
                "total_personnel", personnelRepository.count(),
                "total_resources", resourceRepository.count()
            )
        ));
    }
}
