package com.watermeloncup.draftengine.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@EnableWebSocketMessageBroker
@Configuration
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override 
    public void registerStompEndpoints(StompEndpointRegistry r) {
        r.addEndpoint("/draft-ws")
         .setAllowedOriginPatterns(
                                    "https://draftengine.watermeloncup.com",
                                    "https://watermeloncup.com",
                                    "http://localhost:*")
         .withSockJS();
    }
    
    @Override 
    public void configureMessageBroker(MessageBrokerRegistry r) {
        r.enableSimpleBroker("/topic");
        r.setApplicationDestinationPrefixes("/app");
    }
}
