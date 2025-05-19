package com.watermeloncup.draftengine.service;

import com.watermeloncup.draftengine.model.Captain;
import com.watermeloncup.draftengine.model.UserInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Service to manage team captains for the draft
 */
@Service
public class CaptainService {
    private static final Logger logger = LoggerFactory.getLogger(CaptainService.class);
    private static final int MAX_CAPTAINS = 6;
    
    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, Captain> captains = new ConcurrentHashMap<>();
    private final DraftService draftService;
    
    public CaptainService(SimpMessagingTemplate messagingTemplate, DraftService draftService) {
        this.messagingTemplate = messagingTemplate;
        this.draftService = draftService;
    }
    
    /**
     * Check if a user can become a captain
     * @return true if the user can become a captain, false otherwise
     */
    public boolean canBecomeCaptain() {
        return captains.size() < MAX_CAPTAINS;
    }
    
    /**
     * Check if a user is already a captain
     * @param userId the user ID to check
     * @return true if the user is already a captain, false otherwise
     */
    public boolean isUserCaptain(String userId) {
        return captains.values().stream()
            .anyMatch(captain -> captain.getUserId().equals(userId));
    }
    
    /**
     * Register a user as a team captain
     * @param userInfo the user information
     * @param sessionId the WebSocket session ID
     * @return true if the user was registered as a captain, false otherwise
     */
    public synchronized boolean registerCaptain(UserInfo userInfo, String sessionId) {
        // Check if we already have the maximum number of captains
        if (captains.size() >= MAX_CAPTAINS) {
            logger.info("Cannot register captain: Maximum number of captains reached");
            return false;
        }
        
        // Check if this user is already a captain
        if (isUserCaptain(userInfo.getUid())) {
            // Update the session ID for the existing captain
            for (Captain captain : captains.values()) {
                if (captain.getUserId().equals(userInfo.getUid())) {
                    captain.setSessionId(sessionId);
                    logger.info("Updated session ID for existing captain: {}", captain.getFullName());
                    broadcastCaptainUpdate();
                    return true;
                }
            }
        }
        
        // Create a new captain
        Captain captain = new Captain(
            userInfo.getUid(),
            userInfo.getEmail(),
            userInfo.getFirstName(),
            userInfo.getLastName(),
            sessionId
        );
        
        captains.put(userInfo.getUid(), captain);
        logger.info("Registered new captain: {}", captain.getFullName());
        
        // Broadcast the updated list of captains
        broadcastCaptainUpdate();
        
        // If we now have the maximum number of captains, initialize the draft
        if (captains.size() == MAX_CAPTAINS) {
            initializeDraft();
        }
        
        return true;
    }
    
    /**
     * Handle captain disconnection by marking their session as inactive
     * @param sessionId the WebSocket session ID
     */
    public synchronized void removeCaptainBySessionId(String sessionId) {
        Optional<Captain> captainToUpdate = captains.values().stream()
            .filter(captain -> captain.getSessionId() != null && captain.getSessionId().equals(sessionId))
            .findFirst();
            
        captainToUpdate.ifPresent(captain -> {
            // Don't remove the captain, just mark their session as inactive
            captain.setSessionId(null);
            logger.info("Captain disconnected (session marked inactive): {}", captain.getFullName());
            broadcastCaptainUpdate();
        });
    }
    
    /**
     * Update a captain's session ID when they reconnect
     * @param userId the user ID
     * @param sessionId the new WebSocket session ID
     * @return true if the captain was updated, false otherwise
     */
    public synchronized boolean updateCaptainSessionId(String userId, String sessionId) {
        if (captains.containsKey(userId)) {
            Captain captain = captains.get(userId);
            captain.setSessionId(sessionId);
            logger.info("Updated session ID for captain: {}", captain.getFullName());
            
            // Broadcast the updated list of captains
            broadcastCaptainUpdate();
            return true;
        }
        return false;
    }
    
    /**
     * Get a captain by user ID
     * @param userId the user ID
     * @return the captain, or null if not found
     */
    public Captain getCaptainByUserId(String userId) {
        return captains.get(userId);
    }
    
    /**
     * Get a captain by session ID
     * @param sessionId the WebSocket session ID
     * @return the captain, or null if not found
     */
    public Captain getCaptainBySessionId(String sessionId) {
        return captains.values().stream()
            .filter(captain -> captain.getSessionId().equals(sessionId))
            .findFirst()
            .orElse(null);
    }
    
    /**
     * Get all captains
     * @return a list of all captains
     */
    public List<Captain> getAllCaptains() {
        return new ArrayList<>(captains.values());
    }
    
    /**
     * Get the number of registered captains
     * @return the number of captains
     */
    public int getCaptainCount() {
        return captains.size();
    }
    
    /**
     * Check if the maximum number of captains has been reached
     * @return true if the maximum number of captains has been reached, false otherwise
     */
    public boolean isMaxCaptainsReached() {
        return captains.size() >= MAX_CAPTAINS;
    }
    
    /**
     * Broadcast the current list of captains to all clients
     */
    public void broadcastCaptainUpdate() {
        List<Map<String, Object>> captainsList = captains.values().stream()
            .map(captain -> {
                Map<String, Object> captainMap = new HashMap<>();
                captainMap.put("userId", captain.getUserId());
                captainMap.put("firstName", captain.getFirstName());
                captainMap.put("lastName", captain.getLastName());
                captainMap.put("teamName", captain.getTeamName());
                // Add a flag to indicate if the captain is active (has a valid session)
                captainMap.put("active", captain.getSessionId() != null);
                return captainMap;
            })
            .collect(Collectors.toList());
            
        Map<String, Object> captainsData = new HashMap<>();
        captainsData.put("captains", captainsList);
        captainsData.put("count", captains.size());
        captainsData.put("maxCaptains", MAX_CAPTAINS);
        captainsData.put("canBecomeCaptain", canBecomeCaptain());
        
        // Log the active and inactive captains
        long activeCaptains = captains.values().stream()
            .filter(captain -> captain.getSessionId() != null)
            .count();
        logger.info("Broadcasting captain update: {} captains registered ({} active, {} inactive)", 
            captains.size(), activeCaptains, captains.size() - activeCaptains);
        messagingTemplate.convertAndSend("/topic/captains", captainsData);
    }
    
    /**
     * Initialize the draft with the current captains
     */
    private void initializeDraft() {
        logger.info("Initializing draft with {} captains", captains.size());
        
        // Initialize the draft with the captains
        draftService.initializeWithCaptains(new ArrayList<>(captains.values()));
    }
    
    /**
     * Scheduled task to broadcast captain updates
     * Runs every 10 seconds
     */
    @Scheduled(fixedRate = 10000)
    public void scheduledBroadcastCaptainUpdate() {
        logger.debug("Running scheduled captain update broadcast");
        broadcastCaptainUpdate();
    }
}
