package com.example.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class WebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Handles: socket.emit('location_update', data)
    @MessageMapping("/location-update")
    public void handleLocationUpdate(@Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/personnel_location_updated", (Object) payload);

        if (payload.containsKey("assigned_incident_id")) {
            String incidentId = payload.get("assigned_incident_id").toString();
            messagingTemplate.convertAndSend("/topic/incident_" + incidentId, (Object) payload);
        }
    }

    // Handles: socket.emit('new_message', data)
    @MessageMapping("/new-message")
    public void handleNewMessage(@Payload Map<String, Object> payload) {
        if (payload.containsKey("incident_id")) {
            String incidentId = payload.get("incident_id").toString();
            messagingTemplate.convertAndSend("/topic/incident_" + incidentId, (Object) payload);
        }
    }

    // Handles: socket.emit('broadcast_message', data)
    @MessageMapping("/broadcast-message")
    public void handleBroadcast(@Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/broadcast_received", (Object) payload);
    }
}
