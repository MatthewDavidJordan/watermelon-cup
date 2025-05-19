package com.watermeloncup.draftengine.model;

/**
 * Model class to hold user information passed from the client
 */
public class UserInfo {
    private String email;
    private String uid;
    private String firstName;
    private String lastName;
    
    // Default constructor for JSON deserialization
    public UserInfo() {
    }
    
    public UserInfo(String email, String uid) {
        this.email = email;
        this.uid = uid;
    }
    
    public UserInfo(String email, String uid, String firstName, String lastName) {
        this.email = email;
        this.uid = uid;
        this.firstName = firstName;
        this.lastName = lastName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getUid() {
        return uid;
    }
    
    public void setUid(String uid) {
        this.uid = uid;
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
    
    public String getFullName() {
        if (firstName != null && lastName != null) {
            return firstName + " " + lastName;
        } else if (firstName != null) {
            return firstName;
        } else if (lastName != null) {
            return lastName;
        } else {
            return email;
        }
    }
    
    @Override
    public String toString() {
        return "UserInfo{" +
                "email='" + email + '\'' +
                ", uid='" + uid + '\'' +
                ", firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                '}';
    }
}
