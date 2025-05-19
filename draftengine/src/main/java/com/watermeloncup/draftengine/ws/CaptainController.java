package com.watermeloncup.draftengine.ws;

import com.watermeloncup.draftengine.model.UserInfo;
import com.watermeloncup.draftengine.service.CaptainService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller for handling captain-related WebSocket messages
 */
@Controller
public class CaptainController {
    private static final Logger logger = LoggerFactory.getLogger(CaptainController.class);
    private final CaptainService captainService;
    
    public CaptainController(CaptainService captainService) {
        this.captainService = captainService;
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
        
        // Register the user as a captain
        boolean registered = captainService.registerCaptain(userInfo, sessionId);
        
        if (registered) {
            logger.info("Successfully registered user as captain: {}", username);
            response.put("success", true);
            response.put("message", "You are now a captain");
            
            // Explicitly broadcast captain updates to all clients
            captainService.broadcastCaptainUpdate();
        } else {
            logger.info("Failed to register user as captain: {}", username);
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
