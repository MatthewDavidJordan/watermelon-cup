package com.watermeloncup.draftengine.model;

/**
 * Represents a team captain in the draft.
 */
public class Captain {
    private String userId;
    private String email;
    private String firstName;
    private String lastName;
    private String sessionId;
    private String teamName;
    
    /**
     * Default constructor for JSON deserialization
     */
    public Captain() {
    }
    
    /**
     * Constructor with all fields
     */
    public Captain(String userId, String email, String firstName, String lastName, String sessionId) {
        this.userId = userId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.sessionId = sessionId;
        this.teamName = firstName + "'s Team"; // Default team name based on captain's first name
    }
    
    // Getters and setters
    public String getUserId() {
        return userId;
    }
    
    public void setUserId(String userId) {
        this.userId = userId;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getFirstName() {
        return firstName;
    }
    
    public void setFirstName(String firstName) {
        this.firstName = firstName;
        // Update team name when first name changes
        if (this.teamName == null || this.teamName.equals(getDefaultTeamName())) {
            this.teamName = firstName + "'s Team";
        }
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    
    public String getSessionId() {
        return sessionId;
    }
    
    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
    
    public String getTeamName() {
        return teamName;
    }
    
    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }
    
    /**
     * Get the default team name based on the captain's first name
     */
    public String getDefaultTeamName() {
        return firstName + "'s Team";
    }
    
    /**
     * Returns the full name of the captain
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        
        Captain captain = (Captain) o;
        
        return userId != null ? userId.equals(captain.userId) : captain.userId == null;
    }
    
    @Override
    public int hashCode() {
        return userId != null ? userId.hashCode() : 0;
    }
    
    @Override
    public String toString() {
        return "Captain{" +
                "userId='" + userId + '\'' +
                ", email='" + email + '\'' +
                ", firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                ", teamName='" + teamName + '\'' +
                '}';
    }
}
