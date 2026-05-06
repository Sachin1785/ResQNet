package com.example.demo.controller;

import com.example.demo.model.Communication;
import com.example.demo.repository.CommunicationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comms")
public class CommunicationController {

    @Autowired
    private CommunicationRepository communicationRepository;

    @GetMapping("/incident/{incidentId}")
    public ResponseEntity<Map<String, Object>> getIncidentComms(@PathVariable Long incidentId) {
        List<Communication> comms = communicationRepository.findByIncidentIdOrderByCreatedAtDesc(incidentId);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "communications", comms,
            "count", comms.size()
        ));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Communication communication) {
        Communication saved = communicationRepository.save(communication);
        return ResponseEntity.status(201).body(Map.of(
            "success", true,
            "comm_id", saved.getId()
        ));
    }

    @GetMapping("/broadcast")
    public ResponseEntity<Map<String, Object>> getBroadcasts() {
        List<Communication> broadcasts = communicationRepository.findByIncidentIdIsNullAndType("broadcast");
        return ResponseEntity.ok(Map.of(
            "success", true,
            "communications", broadcasts,
            "count", broadcasts.size()
        ));
    }
}
