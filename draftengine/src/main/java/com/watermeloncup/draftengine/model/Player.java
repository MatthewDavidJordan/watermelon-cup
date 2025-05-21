package com.watermeloncup.draftengine.model;

import java.util.List;

/**
 * Represents a player in the draft engine.
 */
public class Player {
    /**
     * Unique identifier for the player.
     */
    private String id;

    /**
     * First name of the player.
     */
    private String firstName;

    /**
     * Last name of the player.
     */
    private String lastName;

    /**
     * Position of the player. Can be a String or a List<String>.
     * For backward compatibility, we keep this as Object type.
     */
    private Object position;

    /**
     * Club team of the player.
     */
    private String clubTeam;

    /**
     * Foot preference of the player.
     */
    private String footPref;

    /**
     * Graduation year of the player.
     */
    private String graduationYear;

    /**
     * Email of the player.
     */
    private String email;

    /**
     * Phone number of the player.
     */
    private String phone;

    /**
     * Nickname of the player.
     */
    private String nickname;
    
    /**
     * Registration flag for 2024 season
     */
    private boolean registered2024;
    
    /**
     * Registration flag for 2025 season
     */
    private boolean registered2025;
    
    /**
     * Default constructor
     */
    public Player() {
    }
    
    /**
     * Constructor with all fields
     */
    public Player(String id, String firstName, String lastName, Object position, String clubTeam, 
                 String footPref, String graduationYear, String email, String phone, String nickname,
                 boolean registered2024, boolean registered2025) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.position = position;
        this.clubTeam = clubTeam;
        this.footPref = footPref;
        this.graduationYear = graduationYear;
        this.email = email;
        this.phone = phone;
        this.nickname = nickname;
        this.registered2024 = registered2024;
        this.registered2025 = registered2025;
    }
    
    // Getters and setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getFirstName() {
        return firstName;
    }
    
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    
    /**
     * Gets the player's position(s)
     * @return String representation of position(s)
     */
    public String getPosition() {
        if (position == null) {
            return null;
        }
        
        // If position is a List (array in Firestore), join the elements
        if (position instanceof List) {
            List<?> positionList = (List<?>) position;
            if (positionList.isEmpty()) {
                return null;
            }
            return String.join(", ", positionList.stream()
                .map(Object::toString)
                .toArray(String[]::new));
        }
        
        // Otherwise, return the string representation
        return position.toString();
    }
    
    /**
     * Sets the player's position
     * @param position Can be a String or a List<String>
     */
    public void setPosition(Object position) {
        this.position = position;
    }
    
    public String getClubTeam() {
        return clubTeam;
    }
    
    public void setClubTeam(String clubTeam) {
        this.clubTeam = clubTeam;
    }
    
    public String getFootPref() {
        return footPref;
    }
    
    public void setFootPref(String footPref) {
        this.footPref = footPref;
    }
    
    public String getGraduationYear() {
        return graduationYear;
    }
    
    public void setGraduationYear(String graduationYear) {
        this.graduationYear = graduationYear;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPhone() {
        return phone;
    }
    
    public void setPhone(String phone) {
        this.phone = phone;
    }
    
    public String getNickname() {
        return nickname;
    }
    
    public void setNickname(String nickname) {
        this.nickname = nickname;
    }
    
    public boolean isRegistered2024() {
        return registered2024;
    }
    
    public void setRegistered2024(boolean registered2024) {
        this.registered2024 = registered2024;
    }
    
    public boolean isRegistered2025() {
        return registered2025;
    }
    
    public void setRegistered2025(boolean registered2025) {
        this.registered2025 = registered2025;
    }

    /**
     * Returns the full name of the player (firstName + lastName)
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }
    
    /**
     * Returns a display name that includes nickname if available
     */
    public String getDisplayName() {
        if (nickname != null && !nickname.isEmpty()) {
            return firstName + " \"" + nickname + "\" " + lastName;
        }
        return getFullName();
    }
}
