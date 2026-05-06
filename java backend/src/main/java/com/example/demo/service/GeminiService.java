package com.example.demo.service;

import com.example.demo.model.Incident;
import com.example.demo.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Autowired
    private IncidentRepository incidentRepository;

    @Async
    public void verifyIncidentPhoto(Long incidentId, String fileName) {
        Optional<Incident> incidentOpt = incidentRepository.findById(incidentId);
        if (incidentOpt.isEmpty()) return;
        
        Incident incident = incidentOpt.get();
        String filePath = uploadDir + "/" + fileName;

        
        try {
            byte[] fileContent = Files.readAllBytes(Paths.get(filePath));
            String base64Image = Base64.getEncoder().encodeToString(fileContent);

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey;

            String prompt = String.format("""
                Verify if this image matches a reported emergency.
                Type: %s, Description: %s.
                Respond ONLY in JSON: {"is_verified": true/false, "confidence_score": 0-100, "analysis": "text"}
                """, incident.getType(), incident.getDescription());


            RestTemplate restTemplate = new RestTemplate();
            
            Map<String, Object> request = Map.of(
                "contents", List.of(Map.of(
                    "parts", List.of(
                        Map.of("text", prompt),
                        Map.of("inline_data", Map.of(
                            "mime_type", "image/jpeg",
                            "data", base64Image
                        ))
                    )
                ))
            );

            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
            
            // Note: In production, add parsing logic for the JSON response
            // This mirrors the background verification in Python's routes/incidents.py
            System.out.println("🤖 AI Verification Response for incident " + incidentId + ": " + response);

            // Update incident record
            // For now, let's mark it as verified for demo purposes if the API call succeeds
            incident.setIsVerified(1);
            incidentRepository.save(incident);

        } catch (Exception e) {
            System.err.println("❌ AI Verification failed for incident " + incidentId + ": " + e.getMessage());
        }
    }
}
