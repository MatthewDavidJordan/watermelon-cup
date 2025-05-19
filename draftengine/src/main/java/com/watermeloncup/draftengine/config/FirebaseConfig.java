package com.watermeloncup.draftengine.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.logging.Logger;

@Configuration
public class FirebaseConfig {
    private static final Logger logger = Logger.getLogger(FirebaseConfig.class.getName());
    
    @Bean
    @Primary
    public FirebaseApp firebaseApp() {
        try {
            String path = System.getenv("FIREBASE_CREDENTIALS_PATH");
            if (path == null || path.isEmpty()) {
                logger.warning("FIREBASE_CREDENTIALS_PATH not set, using mock Firebase app for testing");
                return null; // Return null for testing purposes
            }
            
            try (var in = new FileInputStream(path)) {
                FirebaseOptions opts = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(in))
                    .build();
                return FirebaseApp.initializeApp(opts);
            }
        } catch (IOException e) {
            logger.warning("Failed to initialize Firebase: " + e.getMessage() + ", using mock for testing");
            return null; // Return null for testing purposes
        }
    }
}
