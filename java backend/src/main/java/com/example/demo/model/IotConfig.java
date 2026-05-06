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
@Table(name = "iot_configs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IotConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String systemId;

    private String name;
    private Double lat;
    private Double lng;
    private String locationName;

    private Double thresholdGas = 2.5;
    private Double thresholdTemp = 50.0;
    private Double thresholdWater = 20.0;
    private Double thresholdAccl = 15.0;
    private Double thresholdRain = 50.0;
    private Double thresholdPressure = 1050.0;

    private Boolean isActive = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
