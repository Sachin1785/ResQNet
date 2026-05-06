package com.example.demo.controller;

import com.example.demo.model.Resource;
import com.example.demo.repository.ResourceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    @Autowired
    private ResourceRepository resourceRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getResources(@RequestParam(required = false) String status) {
        List<Resource> resources;
        if (status != null) {
            resources = resourceRepository.findByStatus(status);
        } else {
            resources = resourceRepository.findAll();
        }
        return ResponseEntity.ok(Map.of(
            "success", true,
            "resources", resources,
            "count", resources.size()
        ));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createResource(@RequestBody Resource resource) {
        Resource saved = resourceRepository.save(resource);
        return ResponseEntity.status(201).body(Map.of(
            "success", true,
            "resource_id", saved.getId()
        ));
    }
}
