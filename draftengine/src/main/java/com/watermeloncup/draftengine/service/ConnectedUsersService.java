package com.watermeloncup.draftengine.service;

import com.watermeloncup.draftengine.model.UserInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service to track connected users and their session IDs
 */
@Service
public class ConnectedUsersService {
    private static final Logger logger = LoggerFactory.getLogger(ConnectedUsersService.class);
    
    private final SimpMessagingTemplate messagingTemplate;
    
    // Map to store connected users: key is sessionId, value is UserInfo object
    private final Map<String, UserInfo> connectedUsers = new ConcurrentHashMap<>();
    
    // Set to track emails of connected users to prevent duplicates
    private final Set<String> connectedEmails = new HashSet<>();
    
    public ConnectedUsersService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }
    
    /**
     * Check if a session is new (not already tracked)
     * @param sessionId WebSocket session ID
     * @return true if this is a new session, false if already tracked
     */
    public boolean isNewSession(String sessionId) {
        return !connectedUsers.containsKey(sessionId);
    }
    
    /**
     * Add a user to the connected users list
     * @param sessionId WebSocket session ID
     * @param username User's email or anonymous identifier
     */
    public void addUser(String sessionId, String username) {
        UserInfo userInfo = new UserInfo(username, sessionId);
        connectedUsers.put(sessionId, userInfo);
        broadcastConnectedUsers();
    }
    
    /**
     * Add a user with full user info to the connected users list
     * @param sessionId WebSocket session ID
     * @param userInfo Complete user information
     */
    public void addUser(String sessionId, UserInfo userInfo) {
        // Add user to the session map
        connectedUsers.put(sessionId, userInfo);
        
        // Track the email to prevent duplicates in display
        if (userInfo.getEmail() != null) {
            connectedEmails.add(userInfo.getEmail());
            logger.info("Added user with email {} to connected users", userInfo.getEmail());
        }
        
        // Clean up any stale sessions with the same email
        cleanupDuplicateSessions(userInfo.getEmail(), sessionId);
        
        broadcastConnectedUsers();
    }
    
    /**
     * Update a user's information
     * @param email User's email
     * @param updatedInfo Updated user information
     */
    public void updateUserInfo(String email, UserInfo updatedInfo) {
        // Find the session ID for this email
        for (Map.Entry<String, UserInfo> entry : connectedUsers.entrySet()) {
            if (email.equals(entry.getValue().getEmail())) {
                connectedUsers.put(entry.getKey(), updatedInfo);
                broadcastConnectedUsers();
                break;
            }
        }
    }
    
    /**
     * Remove a user from the connected users list
     * @param sessionId WebSocket session ID
     */
    public void removeUser(String sessionId) {
        UserInfo removedUser = connectedUsers.remove(sessionId);
        
        if (removedUser != null && removedUser.getEmail() != null) {
            // Check if this was the last session for this email
            boolean hasOtherSessions = connectedUsers.values().stream()
                .anyMatch(user -> removedUser.getEmail().equals(user.getEmail()));
                
            if (!hasOtherSessions) {
                connectedEmails.remove(removedUser.getEmail());
                logger.info("Removed last session for user with email {}", removedUser.getEmail());
            }
        }
        
        broadcastConnectedUsers();
    }
    
    /**
     * Get all connected users
     * @return List of user display names
     */
    public List<String> getConnectedUserDisplayNames() {
        // Use distinct to prevent duplicate names
        return connectedUsers.values().stream()
            .map(userInfo -> userInfo.getFullName())
            .distinct()
            .collect(Collectors.toList());
    }
    
    /**
     * Get all connected user info objects
     * @return List of UserInfo objects
     */
    public List<UserInfo> getConnectedUserInfos() {
        return List.copyOf(connectedUsers.values());
    }
    
    /**
     * Get count of connected users
     * @return Number of connected users
     */
    public int getConnectedUsersCount() {
        return connectedUsers.size();
    }
    
    /**
     * Clean up duplicate sessions for the same user
     * @param email User's email
     * @param currentSessionId Current session ID to keep
     */
    private void cleanupDuplicateSessions(String email, String currentSessionId) {
        if (email == null) return;
        
        // Find all sessions with the same email except the current one
        List<String> duplicateSessions = connectedUsers.entrySet().stream()
            .filter(entry -> !entry.getKey().equals(currentSessionId))
            .filter(entry -> {
                UserInfo userInfo = entry.getValue();
                return userInfo != null && email.equals(userInfo.getEmail());
            })
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
            
        // Log the number of duplicate sessions found
        if (!duplicateSessions.isEmpty()) {
            logger.info("Found {} duplicate sessions for email {}", duplicateSessions.size(), email);
            
            // Remove the duplicate sessions
            for (String sessionId : duplicateSessions) {
                connectedUsers.remove(sessionId);
                logger.info("Removed duplicate session {} for email {}", sessionId, email);
            }
        }
    }
    
    /**
     * Get a list of all session IDs
     * @return List of all session IDs
     */
    public List<String> getAllSessionIds() {
        return new ArrayList<>(connectedUsers.keySet());
    }
    
    /**
     * Clear all connected users
     */
    public void clearAllUsers() {
        connectedUsers.clear();
        connectedEmails.clear();
        broadcastConnectedUsers();
        logger.info("Cleared all connected users");
    }
    
    /**
     * Broadcast the current list of connected users to all clients
     */
    public void broadcastConnectedUsers() {
        // Filter out any null or anonymous users
        List<String> uniqueUsers = connectedUsers.values().stream()
            .filter(user -> user != null && user.getEmail() != null && !"anonymous".equals(user.getEmail()))
            .map(userInfo -> userInfo.getFullName())
            .distinct()
            .collect(Collectors.toList());
            
        int uniqueCount = uniqueUsers.size();
        
        logger.info("Broadcasting {} unique connected users: {}", uniqueCount, String.join(", ", uniqueUsers));
        
        messagingTemplate.convertAndSend("/topic/connected-users", 
            Map.of("users", uniqueUsers, "count", uniqueCount));
    }
}
