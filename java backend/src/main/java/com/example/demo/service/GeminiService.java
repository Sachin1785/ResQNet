package com.example.demo.service;

import com.example.demo.model.Incident;
import com.example.demo.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

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

    private final ObjectMapper objectMapper = new ObjectMapper();

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
            
            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> candidate = candidates.get(0);
                    Map<String, Object> content = (Map<String, Object>) candidate.get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (!parts.isEmpty()) {
                        String aiResponseText = (String) parts.get(0).get("text");
                        
                        // Parse the JSON from the text block
                        try {
                            // Extract JSON if it's wrapped in markdown code blocks
                            String jsonStr = aiResponseText.trim();
                            if (jsonStr.startsWith("```json")) {
                                jsonStr = jsonStr.substring(7, jsonStr.length() - 3).trim();
                            } else if (jsonStr.startsWith("```")) {
                                jsonStr = jsonStr.substring(3, jsonStr.length() - 3).trim();
                            }

                            JsonNode jsonNode = objectMapper.readTree(jsonStr);
                            boolean isVerified = jsonNode.has("is_verified") && jsonNode.get("is_verified").asBoolean();
                            int confidenceScore = jsonNode.has("confidence_score") ? jsonNode.get("confidence_score").asInt() : 0;
                            String analysis = jsonNode.has("analysis") ? jsonNode.get("analysis").asText() : "";

                            System.out.println("🤖 AI Verification Result for incident " + incidentId + ": " + isVerified + " (Score: " + confidenceScore + ")");

                            // Update incident record
                            incident.setIsVerified(isVerified ? 1 : 0);
                            incident.setVerificationScore(confidenceScore);
                            incident.setAiAnalysis(analysis);
                            incidentRepository.save(incident);
                        } catch (Exception e) {
                            System.err.println("❌ Failed to parse AI JSON response: " + e.getMessage());
                            // Fallback: mark as verified but score 0 if we at least got a response
                            incident.setIsVerified(1);
                            incidentRepository.save(incident);
                        }
                    }
                }
            }

        } catch (Exception e) {
            System.err.println("❌ AI Verification failed for incident " + incidentId + ": " + e.getMessage());
        }
    }
}
