package com.example.demo.controller;

import com.example.demo.model.Attachment;
import com.example.demo.model.Incident;
import com.example.demo.repository.AttachmentRepository;
import com.example.demo.repository.IncidentRepository;
import com.example.demo.service.FileService;
import com.example.demo.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private FileService fileService;

    @Autowired
    private GeminiService geminiService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getIncidents(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String type) {

        List<Incident> incidents;
        if (status != null && type != null) {
            incidents = incidentRepository.findByTypeAndStatus(type, status);
        } else if (status != null) {
            incidents = incidentRepository.findByStatus(status);
        } else {
            incidents = incidentRepository.findAll();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("incidents", incidents);
        response.put("count", incidents.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getIncident(@PathVariable Long id) {
        return incidentRepository.findById(id).map(incident -> {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("incident", incident);
            return ResponseEntity.ok(response);
        }).orElseGet(() -> {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Incident not found");
            return ResponseEntity.status(404).body(error);
        });
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createIncident(@RequestBody Incident incident) {
        if (incident.getStatus() == null) incident.setStatus("active");
        if (incident.getReportCount() == null) incident.setReportCount(1);
        if (incident.getVictimsCount() == null) incident.setVictimsCount(0);

        Incident saved = incidentRepository.save(incident);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("incident_id", saved.getId());
        response.put("message", "Incident created successfully");
        return ResponseEntity.status(201).body(response);
    }

    @PostMapping("/{id}/upload")
    public ResponseEntity<Map<String, Object>> uploadFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {

        return incidentRepository.findById(id).map(incident -> {
            try {
                String fileName = fileService.storeFile(file, id);

                Attachment attachment = Attachment.builder()
                        .incident(incident)
                        .filename(fileName)
                        .filepath("uploads/" + fileName)
                        .fileType(file.getContentType())
                        .fileSize((int) file.getSize())
                        .build();

                attachmentRepository.save(attachment);

                if (file.getContentType() != null && file.getContentType().startsWith("image/")) {
                    geminiService.verifyIncidentPhoto(id, fileName);
                }

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "File uploaded successfully");
                response.put("filename", fileName);
                return ResponseEntity.<Map<String, Object>>status(201).body(response);

            } catch (IOException e) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("error", "File upload failed: " + e.getMessage());
                return ResponseEntity.<Map<String, Object>>internalServerError().body(error);
            }
        }).orElseGet(() -> {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Incident not found");
            return ResponseEntity.<Map<String, Object>>status(404).body(error);
        });
    }
}
