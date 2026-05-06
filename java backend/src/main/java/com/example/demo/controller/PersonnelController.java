package com.example.demo.controller;

import com.example.demo.model.Personnel;
import com.example.demo.repository.PersonnelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/personnel")
public class PersonnelController {

    @Autowired
    private PersonnelRepository personnelRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getPersonnel() {
        List<Personnel> personnel = personnelRepository.findAll();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("personnel", personnel);
        response.put("count", personnel.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getPersonnelById(@PathVariable Long id) {
        return personnelRepository.findById(id).map(person -> {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("personnel", person);
            return ResponseEntity.ok(response);
        }).orElseGet(() -> {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Personnel not found");
            return ResponseEntity.status(404).body(error);
        });
    }

    @PutMapping("/{id}/location")
    public ResponseEntity<Map<String, Object>> updateLocation(
            @PathVariable Long id,
            @RequestBody Map<String, Double> location) {

        return personnelRepository.findById(id).map(person -> {
            person.setLat(location.get("lat"));
            person.setLng(location.get("lng"));
            personnelRepository.save(person);

            // Broadcast real-time location update
            Map<String, Object> broadcast = new HashMap<>();
            broadcast.put("personnel_id", id);
            broadcast.put("name", person.getName());
            broadcast.put("lat", person.getLat());
            broadcast.put("lng", person.getLng());
            broadcast.put("status", person.getStatus());
            messagingTemplate.convertAndSend("/topic/personnel_location_updated", (Object) broadcast);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Location updated");
            return ResponseEntity.ok(response);
        }).orElseGet(() -> {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Personnel not found");
            return ResponseEntity.status(404).body(error);
        });
    }
}
