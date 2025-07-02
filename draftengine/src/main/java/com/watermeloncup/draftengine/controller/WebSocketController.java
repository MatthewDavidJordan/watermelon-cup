package com.watermeloncup.draftengine.controller;

import com.watermeloncup.draftengine.model.Captain;
import com.watermeloncup.draftengine.service.CaptainService;
import com.watermeloncup.draftengine.service.DraftService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;

@Controller
public class WebSocketController {
    private static final Logger logger = LoggerFactory.getLogger(WebSocketController.class);
    
    private final CaptainService captainService;
    private final DraftService draftService;
    
    @Autowired
    public WebSocketController(CaptainService captainService, DraftService draftService) {
        this.captainService = captainService;
        this.draftService = draftService;
    }
    
    /**
     * Handle pick requests from captains
     * @param pickRequest Map containing captain ID and player ID
     * @param headerAccessor Message headers to get session ID
     * @return Success status
     */
    @MessageMapping("/pick-legacy")
    @SendTo("/topic/pick-response")
    public Map<String, Object> handlePick(Map<String, String> pickRequest, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        String playerId = pickRequest.get("playerId");
        Map<String, Object> response = new HashMap<>();
        
        logger.info("Received pick request for player {} from session {}", playerId, sessionId);
        
        // Find the captain by session ID
        Captain captain = captainService.getCaptainBySessionId(sessionId);
        
        if (captain == null) {
            logger.warn("No captain found for session {}", sessionId);
            response.put("success", false);
            response.put("message", "You are not registered as a captain");
            return response;
        }
        
        try {
            // Make the pick
            draftService.makePick(captain.getUserId(), playerId);
            response.put("success", true);
            return response;
        } catch (Exception e) {
            logger.error("Error making pick: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return response;
        }
    }
    
    /**
     * Handle autodraft preference updates
     * @param request Map containing autodraft preference
     * @param headerAccessor Message headers to get session ID
     * @return Success status
     */
    @MessageMapping("/autodraft")
    @SendTo("/topic/autodraft-response")
    public Map<String, Object> handleAutoDraft(Map<String, Boolean> request, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        Boolean enabled = request.get("enabled");
        Map<String, Object> response = new HashMap<>();
        
        if (enabled == null) {
            enabled = false;
        }
        
        logger.info("Received autodraft preference update: {} from session {}", enabled, sessionId);
        
        // Find the captain by session ID
        Captain captain = captainService.getCaptainBySessionId(sessionId);
        
        if (captain == null) {
            logger.warn("No captain found for session {}", sessionId);
            response.put("success", false);
            response.put("message", "You are not registered as a captain");
            return response;
        }
        
        try {
            // Update autodraft preference
            draftService.setAutoDraftPreference(captain.getUserId(), enabled);
            response.put("success", true);
            response.put("enabled", enabled);
            return response;
        } catch (Exception e) {
            logger.error("Error updating autodraft preference: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return response;
        }
    }
    
    /**
     * Handle captain registration requests
     * @param request Map containing registration request
     * @param headerAccessor Message headers to get session ID
     * @return Success status
     */
    @MessageMapping("/register-captain")
    @SendTo("/topic/register-response")
    public Map<String, Object> handleRegisterCaptain(Map<String, String> request, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        String userId = request.get("userId");
        String firstName = request.get("firstName");
        String lastName = request.get("lastName");
        String email = request.get("email");
        Map<String, Object> response = new HashMap<>();
        
        logger.info("Received captain registration request for user {} from session {}", userId, sessionId);
        
        if (userId == null || userId.isEmpty()) {
            response.put("success", false);
            response.put("message", "User ID is required");
            return response;
        }
        
        // Check if we can register more captains
        if (!captainService.canBecomeCaptain()) {
            response.put("success", false);
            response.put("message", "Maximum number of captains reached");
            return response;
        }
        
        // Create a user info object for the captain service
        com.watermeloncup.draftengine.model.UserInfo userInfo = new com.watermeloncup.draftengine.model.UserInfo();
        userInfo.setUid(userId);
        userInfo.setFirstName(firstName);
        userInfo.setLastName(lastName);
        userInfo.setEmail(email);
        
        boolean registered = captainService.registerCaptain(userInfo, sessionId);
        
        response.put("success", registered);
        if (registered) {
            response.put("message", "Successfully registered as captain");
        } else {
            response.put("message", "Failed to register as captain");
        }
        
        return response;
    }
    
    /**
     * Request to export teams to Google Sheets
     * @param request Map containing export request
     * @param headerAccessor Message headers to get session ID
     * @return Success status
     */
    @MessageMapping("/export-teams")
    @SendTo("/topic/export-response")
    public Map<String, Object> handleExportTeams(Map<String, Object> request, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        Map<String, Object> response = new HashMap<>();
        
        logger.info("Received export teams request from session {}", sessionId);
        
        // Check if the user is a captain
        Captain captain = captainService.getCaptainBySessionId(sessionId);
        
        if (captain == null) {
            logger.warn("No captain found for session {}", sessionId);
            response.put("success", false);
            response.put("message", "You are not registered as a captain");
            return response;
        }
        
        try {
            // Get the current draft state
            String sheetUrl = draftService.getExportedSheetUrl();
            
            if (sheetUrl != null) {
                // If we already have a URL, return it
                logger.info("Teams already exported to: {}", sheetUrl);
                response.put("success", true);
                response.put("message", "Teams already exported");
                response.put("url", sheetUrl);
            } else {
                // Otherwise, trigger a new export
                response.put("success", true);
                response.put("message", "Export request received. Processing...");
                
                // This will be handled by the ExportController
                // We'll return a success response here, and the actual export will be broadcast to all clients
            }
            
            return response;
        } catch (Exception e) {
            logger.error("Error handling export request: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return response;
        }
    }
}
