package com.watermeloncup.draftengine.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

import com.watermeloncup.draftengine.model.UserInfo;
import com.watermeloncup.draftengine.service.CaptainService;
import com.watermeloncup.draftengine.service.ConnectedUsersService;

import java.security.Principal;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Event listener for WebSocket events to log connections, disconnections, and other session events.
 */
@Component
public class WebSocketEventListener {
    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);
    
    // This field is now used by the ConnectedUsersService through dependency injection
    // but not directly in this class
    @SuppressWarnings("unused")
    private final SimpMessagingTemplate messagingTemplate;
    
    // Counter to track the number of active WebSocket connections
    private final AtomicInteger activeConnections = new AtomicInteger(0);
    
    // Set to track all connected session IDs
    private final Set<String> connectedSessions = new HashSet<>();
    
    // Service to track connected users
    private final ConnectedUsersService connectedUsersService;
    
    // Service to track team captains
    private final CaptainService captainService;
    
    public WebSocketEventListener(SimpMessagingTemplate messagingTemplate, 
                                ConnectedUsersService connectedUsersService,
                                CaptainService captainService) {
        this.messagingTemplate = messagingTemplate;
        this.connectedUsersService = connectedUsersService;
        this.captainService = captainService;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String sessionId = headers.getSessionId();
        Principal user = headers.getUser();
        String username = user != null ? user.getName() : "anonymous";
        
        logger.info("WebSocket connection attempt - Session ID: {}, User: {}", sessionId, username);
    }

    @EventListener
    public void handleWebSocketConnectedListener(SessionConnectedEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String sessionId = headers.getSessionId();
        Principal user = headers.getUser();
        String username = user != null ? user.getName() : "anonymous";
        
        // Check if we've seen this session ID before
        boolean isNewSession = !connectedSessions.contains(sessionId);
        
        // Track all sessions for counting purposes
        if (isNewSession) {
            connectedSessions.add(sessionId);
        }
        
        // Only track non-anonymous users in our service
        // Anonymous users will be updated with real info when they authenticate
        if (!"anonymous".equals(username)) {
            UserInfo userInfo = new UserInfo(username, sessionId);
            connectedUsersService.addUser(sessionId, userInfo);
        }
        
        // Only increment the counter for new sessions
        int totalConnections = isNewSession ? 
            activeConnections.incrementAndGet() : 
            activeConnections.get();
            
        logger.info("WebSocket connection established - Session ID: {}, User: {}, New Session: {}, Total Connections: {}", 
                sessionId, username, isNewSession, totalConnections);
        
        // Broadcast captain updates to ensure all clients have the latest information
        captainService.broadcastCaptainUpdate();
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String sessionId = headers.getSessionId();
        Principal user = headers.getUser();
        String username = user != null ? user.getName() : "anonymous";
        
        // Remove the user from our tracking service
        connectedUsersService.removeUser(sessionId);
        
        // Remove from our session tracking set
        connectedSessions.remove(sessionId);
        
        // Check if this session belongs to a captain
        // We don't remove captains when they disconnect, just mark their session as inactive
        // This allows them to reconnect and continue as the same captain
        captainService.removeCaptainBySessionId(sessionId);
        
        int totalConnections = activeConnections.decrementAndGet();
        logger.info("WebSocket connection closed - Session ID: {}, User: {}, Status: {}, Total Connections: {}", 
                sessionId, username, event.getCloseStatus(), totalConnections);
                
        // Broadcast captain updates to ensure all clients have the latest information
        captainService.broadcastCaptainUpdate();
    }

    @EventListener
    public void handleWebSocketSubscribeListener(SessionSubscribeEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String sessionId = headers.getSessionId();
        Principal user = headers.getUser();
        String username = user != null ? user.getName() : "anonymous";
        String destination = getDestination(headers);
        
        logger.info("WebSocket subscription - Session ID: {}, User: {}, Topic: {}", 
                sessionId, username, destination);
    }

    @EventListener
    public void handleWebSocketUnsubscribeListener(SessionUnsubscribeEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String sessionId = headers.getSessionId();
        Principal user = headers.getUser();
        String username = user != null ? user.getName() : "anonymous";
        String destination = getDestination(headers);
        
        logger.info("WebSocket unsubscription - Session ID: {}, User: {}, Topic: {}", 
                sessionId, username, destination);
    }
    
    /**
     * Scheduled task to clean up stale sessions
     * Runs every 30 seconds
     */
    @Scheduled(fixedRate = 30000)
    public void cleanupStaleSessions() {
        logger.info("Running scheduled cleanup of stale sessions");
        
        // Get the current count before cleanup
        int beforeCount = connectedUsersService.getConnectedUsersCount();
        
        // Broadcast the current state to ensure it's accurate
        connectedUsersService.broadcastConnectedUsers();
        
        // Get the count after cleanup
        int afterCount = connectedUsersService.getConnectedUsersCount();
        
        if (beforeCount != afterCount) {
            logger.info("Cleaned up {} stale sessions", beforeCount - afterCount);
        }
    }
    
    private String getDestination(SimpMessageHeaderAccessor headers) {
        return Optional.ofNullable(headers.getDestination()).orElse("unknown");
    }
}
