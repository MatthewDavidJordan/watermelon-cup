package com.watermeloncup.draftengine.ws;

import com.watermeloncup.draftengine.model.DraftState;
import com.watermeloncup.draftengine.service.DraftService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@Controller
public class DraftController {
    private static final Logger logger = LoggerFactory.getLogger(DraftController.class);
    private final DraftService draft;
    
    public DraftController(DraftService draft) {
        this.draft = draft;
    }

    @MessageMapping("/pick")            // client → /app/pick
    public void pick(PickDTO pick, Principal p) {
        String captainId = p.getName();
        String playerId = pick.playerId();
        
        logger.info("Player pick request - Captain: {}, Player ID: {}", captainId, playerId);
        
        try {
            draft.makePick(captainId, playerId);
            logger.info("Player pick successful - Captain: {}, Player ID: {}", captainId, playerId);
        } catch (Exception e) {
            logger.error("Player pick failed - Captain: {}, Player ID: {}, Error: {}", 
                    captainId, playerId, e.getMessage());
            throw e;
        }
    }
    
    /**
     * Handle player pick messages with explicit captain ID
     * @param pickRequest the pick request containing captainId and playerId
     * @param headerAccessor the message headers
     * @return a response indicating whether the pick was successful
     */
    @MessageMapping("/pick-explicit")
    @SendTo("/topic/pick-response")
    public Map<String, Object> handleExplicitPick(Map<String, String> pickRequest, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        Principal user = headerAccessor.getUser();
        String username = user != null ? user.getName() : "anonymous";
        
        logger.info("Received explicit pick request from user: {}, session: {}", username, sessionId);
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String captainId = pickRequest.get("captainId");
            String playerId = pickRequest.get("playerId");
            
            if (captainId == null || playerId == null) {
                logger.warn("Invalid pick request: missing captainId or playerId");
                response.put("success", false);
                response.put("message", "Invalid pick request: missing captainId or playerId");
                return response;
            }
            
            draft.makePick(captainId, playerId);
            
            response.put("success", true);
            response.put("message", "Pick successful");
        } catch (Exception e) {
            logger.error("Error processing pick request: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        
        return response;
    }
    
    /**
     * Handle player pick messages from the new UI
     * @param pickRequest the pick request containing captainId and playerId
     * @return a response indicating whether the pick was successful
     */
    @MessageMapping("/make-pick")
    @SendTo("/topic/pick-response")
    public Map<String, Object> makePick(Map<String, String> pickRequest) {
        logger.info("Received make-pick request: {}", pickRequest);
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String captainId = pickRequest.get("captainId");
            String playerId = pickRequest.get("playerId");
            
            if (captainId == null || playerId == null) {
                logger.warn("Invalid pick request: missing captainId or playerId");
                response.put("success", false);
                response.put("message", "Invalid pick request: missing captainId or playerId");
                return response;
            }
            
            // Validate that the captainId matches the current captain's turn
            DraftState currentState = draft.currentState();
            if (!captainId.equals(currentState.currentCaptainId())) {
                logger.warn("Invalid pick request: not captain's turn. Expected: {}, Got: {}", 
                    currentState.currentCaptainId(), captainId);
                response.put("success", false);
                response.put("message", "It's not your turn to pick");
                return response;
            }
            
            draft.makePick(captainId, playerId);
            
            response.put("success", true);
            response.put("message", "Pick successful");
        } catch (Exception e) {
            logger.error("Error processing pick request: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        
        return response;
    }

    /**
     * Handle autodraft toggle requests
     * @param request the request containing captainId and autoDraftEnabled flag
     * @return a response indicating whether the request was successful
     */
    @MessageMapping("/set-autodraft")
    @SendTo("/topic/autodraft-response")
    public Map<String, Object> setAutoDraft(Map<String, Object> request) {
        logger.info("Received autodraft toggle request: {}", request);
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String captainId = (String) request.get("captainId");
            Boolean autoDraftEnabled = (Boolean) request.get("autoDraftEnabled");
            
            if (captainId == null || autoDraftEnabled == null) {
                logger.warn("Invalid autodraft request: missing captainId or autoDraftEnabled");
                response.put("success", false);
                response.put("message", "Invalid autodraft request: missing captainId or autoDraftEnabled");
                return response;
            }
            
            draft.setAutoDraftPreference(captainId, autoDraftEnabled);
            
            response.put("success", true);
            response.put("message", "Autodraft preference updated");
            response.put("captainId", captainId);
            response.put("autoDraftEnabled", autoDraftEnabled);
        } catch (Exception e) {
            logger.error("Error processing autodraft request: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        
        return response;
    }
    
    @MessageMapping("/heartbeat")       // optional ping
    @SendTo("/topic/draft")
    public DraftState heartbeat() {
        logger.debug("Heartbeat received, returning current draft state");
        DraftState state = draft.currentState();
        return state;
    }
}

record PickDTO(String playerId) {}
