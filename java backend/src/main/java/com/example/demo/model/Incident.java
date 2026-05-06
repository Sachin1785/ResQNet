package com.example.demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String severity;

    @Column(nullable = false)
    private String status = "active";

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    private String locationName;
    private String reportSource;
    private Integer reportedBy;
    private String reporterPhone;
    
    @Column(nullable = false)
    private Integer victimsCount = 0;
    
    @Column(nullable = false)
    private Integer reportCount = 1;

    @Column(columnDefinition = "TEXT")
    private String sosmeshMessages;

    private Integer isVerified = 0;
    private Integer verificationScore = 0;
    
    @Column(columnDefinition = "TEXT")
    private String aiAnalysis;
    
    private String systemIdSource;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime resolvedAt;
}
