package com.example.demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "communications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Communication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @ManyToOne
    @JoinColumn(name = "sender_id")
    private User sender;

    private String senderName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    private String type = "text";
    
    private Boolean readStatus = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
