package com.example.demo.config;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DatabaseSeeder {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository) {
        return args -> {
            if (userRepository.count() == 0) {
                System.out.println("🌱 Seeding database with initial users...");
                
                // Regular Users
                userRepository.saveAll(List.of(
                    User.builder().username("user1").password("password123").name("Command Center Admin").role("user").email("admin@crisis.com").phone("+91-9876543210").status("active").build(),
                    User.builder().username("user2").password("password123").name("Operations Manager").role("user").email("ops@crisis.com").phone("+91-9876543211").status("active").build()
                ));

                // Responders
                userRepository.saveAll(List.of(
                    User.builder().username("responder1").password("password123").name("Firefighter John").role("responder").email("john@crisis.com").phone("+91-9876543220").status("active").build(),
                    User.builder().username("responder2").password("password123").name("Paramedic Sarah").role("responder").email("sarah@crisis.com").phone("+91-9876543221").status("active").build()
                ));

                System.out.println("✅ Database seeding complete!");
            }
        };
    }
}
