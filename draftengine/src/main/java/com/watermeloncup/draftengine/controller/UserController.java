package com.watermeloncup.draftengine.controller;

import com.google.firebase.FirebaseApp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.watermeloncup.draftengine.model.UserInfo;
import com.watermeloncup.draftengine.service.CaptainService;
import com.watermeloncup.draftengine.service.ConnectedUsersService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.concurrent.ExecutionException;

@Controller
public class UserController {
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);
    
    private final FirebaseApp firebaseApp;
    private final ConnectedUsersService connectedUsersService;
    private final CaptainService captainService;
    
    @Autowired
    public UserController(FirebaseApp firebaseApp, ConnectedUsersService connectedUsersService, CaptainService captainService) {
        this.firebaseApp = firebaseApp;
        this.connectedUsersService = connectedUsersService;
        this.captainService = captainService;
    }
    
    /**
     * Handle user authentication information and look up user details
     * @param userInfo Basic user info from client
     * @param headerAccessor Message headers to get session ID
     * @return Enhanced user info with first and last name
     */
    @MessageMapping("/auth")
    @SendTo("/topic/auth-response")
    public UserInfo handleUserAuth(UserInfo userInfo, SimpMessageHeaderAccessor headerAccessor) {
        logger.info("Received auth info: {}", userInfo);
        String sessionId = headerAccessor.getSessionId();
        
        // If Firebase is available, look up user details
        if (firebaseApp != null && userInfo.getEmail() != null) {
            try {
                // First try to get user info by UID
                DocumentSnapshot userDoc = null;
                if (userInfo.getUid() != null && !userInfo.getUid().isEmpty()) {
                    userDoc = FirestoreClient.getFirestore(firebaseApp)
                        .collection("users")
                        .document(userInfo.getUid())
                        .get()
                        .get();
                }
                
                // If not found by UID, try by email
                if (userDoc == null || !userDoc.exists()) {
                    userDoc = FirestoreClient.getFirestore(firebaseApp)
                        .collection("users")
                        .document(userInfo.getEmail())
                        .get()
                        .get();
                }
                
                if (userDoc != null && userDoc.exists()) {
                    // Get first and last name from Firestore
                    String firstName = userDoc.getString("firstName");
                    String lastName = userDoc.getString("lastName");
                    
                    if (firstName != null) {
                        userInfo.setFirstName(firstName);
                    }
                    
                    if (lastName != null) {
                        userInfo.setLastName(lastName);
                    }
                    
                    logger.info("Found user details: {}", userInfo);
                    
                    // Add or update the user in the connected users service with full info
                    connectedUsersService.addUser(sessionId, userInfo);
                    
                    // Check if this user is a captain and update their session ID if they are
                    if (userInfo.getUid() != null && !userInfo.getUid().isEmpty()) {
                        boolean captainUpdated = captainService.updateCaptainSessionId(userInfo.getUid(), sessionId);
                        if (captainUpdated) {
                            logger.info("Reconnected captain: {} ({})", userInfo.getFullName(), userInfo.getUid());
                        }
                    }
                } else {
                    logger.warn("User document not found for email: {} or uid: {}", 
                               userInfo.getEmail(), userInfo.getUid());
                }
            } catch (InterruptedException | ExecutionException e) {
                logger.error("Error looking up user details: {}", e.getMessage());
            }
        } else {
            logger.warn("Firebase not available or email not provided");
        }
        
        return userInfo;
    }
}
