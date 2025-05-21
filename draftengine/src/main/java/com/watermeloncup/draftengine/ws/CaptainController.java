package com.watermeloncup.draftengine.ws;

import com.google.firebase.FirebaseApp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.watermeloncup.draftengine.model.UserInfo;
import com.watermeloncup.draftengine.service.CaptainService;
import com.watermeloncup.draftengine.service.ConnectedUsersService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for handling captain-related WebSocket messages
 */
@Controller
public class CaptainController {
    private static final Logger logger = LoggerFactory.getLogger(CaptainController.class);
    private final CaptainService captainService;
    private final ConnectedUsersService connectedUsersService;
    private final FirebaseApp firebaseApp;
    
    public CaptainController(CaptainService captainService, ConnectedUsersService connectedUsersService, FirebaseApp firebaseApp) {
        this.captainService = captainService;
        this.connectedUsersService = connectedUsersService;
        this.firebaseApp = firebaseApp;
    }
    
    /**
     * Handle requests to become a captain
     * @param userInfo the user information
     * @param headerAccessor the message headers
     * @return a response indicating whether the request was successful
     */
    @MessageMapping("/become-captain")
    @SendTo("/topic/captain-response")
    public Map<String, Object> becomeCaptain(UserInfo userInfo, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        Principal user = headerAccessor.getUser();
        String username = user != null ? user.getName() : "anonymous";
        
        logger.info("Received request to become captain from user: {}, session: {}", username, sessionId);
        
        Map<String, Object> response = new HashMap<>();
        
        // Check if the maximum number of captains has been reached
        if (!captainService.canBecomeCaptain()) {
            logger.info("Maximum number of captains reached, rejecting request from: {}", username);
            response.put("success", false);
            response.put("message", "Maximum number of captains reached");
            return response;
        }
        
        // Check if the user is already a captain
        if (captainService.isUserCaptain(userInfo.getUid())) {
            logger.info("User is already a captain: {}", username);
            response.put("success", true);
            response.put("message", "You are already a captain");
            
            // Update the session ID for the existing captain
            captainService.updateCaptainSessionId(userInfo.getUid(), sessionId);
            return response;
        }
        
        // Try to get the user's name from Firebase database to ensure consistency
        if (firebaseApp != null && userInfo.getUid() != null && !userInfo.getUid().isEmpty()) {
            try {
                // Get user data from Firestore using the UID
                DocumentSnapshot userDoc = FirestoreClient.getFirestore(firebaseApp)
                    .collection("users")
                    .document(userInfo.getUid())
                    .get()
                    .get();
                
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
                    
                    logger.info("Using Firebase data for captain: {} {}", firstName, lastName);
                }
            } catch (Exception e) {
                logger.error("Error retrieving user data from Firebase: {}", e.getMessage());
            }
        }
        
        // If we couldn't get the name from Firebase, try to get it from the connected users service
        if ((userInfo.getFirstName() == null || userInfo.getLastName() == null) && 
            userInfo.getEmail() != null && !userInfo.getEmail().isEmpty()) {
            
            // Try to find the user in the connected users list
            List<UserInfo> connectedUsers = connectedUsersService.getConnectedUserInfos();
            for (UserInfo connectedUser : connectedUsers) {
                if (userInfo.getEmail().equals(connectedUser.getEmail()) || 
                    userInfo.getUid().equals(connectedUser.getUid())) {
                    
                    if (userInfo.getFirstName() == null && connectedUser.getFirstName() != null) {
                        userInfo.setFirstName(connectedUser.getFirstName());
                    }
                    
                    if (userInfo.getLastName() == null && connectedUser.getLastName() != null) {
                        userInfo.setLastName(connectedUser.getLastName());
                    }
                    
                    logger.info("Using connected user data for captain: {} {}", 
                              connectedUser.getFirstName(), connectedUser.getLastName());
                    break;
                }
            }
        }
        
        // If we still don't have a name, use the fullName field if available
        if ((userInfo.getFirstName() == null || userInfo.getLastName() == null) && 
            userInfo.getFullName() != null && !userInfo.getFullName().trim().isEmpty()) {
            
            String fullName = userInfo.getFullName().trim();
            String[] nameParts = fullName.split("\\s+", 2);
            
            if (nameParts.length > 0 && userInfo.getFirstName() == null) {
                userInfo.setFirstName(nameParts[0]);
            }
            
            if (nameParts.length > 1 && userInfo.getLastName() == null) {
                userInfo.setLastName(nameParts[1]);
            } else if (userInfo.getLastName() == null) {
                userInfo.setLastName(""); // Set empty last name if only one name part
            }
            
            logger.info("Using fullName field for captain: {}", fullName);
        }
        
        // Register the user as a captain
        boolean registered = captainService.registerCaptain(userInfo, sessionId);
        
        if (registered) {
            logger.info("Successfully registered user as captain: {}", userInfo.getFullName());
            response.put("success", true);
            response.put("message", "You are now a captain");
            
            // Explicitly broadcast captain updates to all clients
            captainService.broadcastCaptainUpdate();
        } else {
            logger.info("Failed to register user as captain: {}", userInfo.getFullName());
            response.put("success", false);
            response.put("message", "Failed to register as captain");
        }
        
        return response;
    }
    
    /**
     * Handle requests to get the current captain status
     * @return the current captain status
     */
    @MessageMapping("/captain-status")
    @SendTo("/topic/captain-status")
    public Map<String, Object> getCaptainStatus() {
        // Explicitly broadcast captain updates to all clients
        captainService.broadcastCaptainUpdate();
        
        // Also return the status directly to the requester
        Map<String, Object> status = new HashMap<>();
        status.put("captainCount", captainService.getCaptainCount());
        status.put("maxCaptains", 6);
        status.put("canBecomeCaptain", captainService.canBecomeCaptain());
        status.put("captains", captainService.getAllCaptains());
        
        return status;
    }
}
