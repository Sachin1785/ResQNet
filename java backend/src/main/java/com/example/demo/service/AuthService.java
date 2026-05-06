package com.example.demo.service;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    // Simple session storage (mirrors the Python implementation)
    private final Map<String, User> activeSessions = new HashMap<>();

    public Map<String, Object> login(String username, String password) {
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent() && passwordEncoder.matches(password, userOpt.get().getPassword())) {
            User user = userOpt.get();
            
            // Update last login
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            // Create token
            String token = UUID.randomUUID().toString();
            activeSessions.put(token, user);

            return Map.of(
                "success", true,
                "token", token,
                "user", user
            );
        }

        return Map.of("success", false, "error", "Invalid credentials");
    }

    public void logout(String token) {
        activeSessions.remove(token);
    }

    public Optional<User> getUserByToken(String token) {
        return Optional.ofNullable(activeSessions.get(token));
    }
}
