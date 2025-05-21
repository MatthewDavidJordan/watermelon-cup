package com.watermeloncup.draftengine.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.cloud.FirestoreClient;
import com.watermeloncup.draftengine.model.Captain;
import com.watermeloncup.draftengine.model.DraftState;
import com.watermeloncup.draftengine.model.Player;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DraftService {
    private static final Logger logger = LoggerFactory.getLogger(DraftService.class);
    private final SimpMessagingTemplate broker;
    private DraftState state;
    private final FirebaseApp firebaseApp;

    @Autowired
    public DraftService(SimpMessagingTemplate broker, @Autowired(required = false) FirebaseApp fb) {
        this.broker = broker;
        this.firebaseApp = fb;
        
        // Load players from Firebase first
        List<Player> players = loadPlayersFromFirebase();
        logger.info("Loaded {} players during initialization", players.size());
        
        // Initialize with empty state but include available players
        this.state = new DraftState(
            null,                // No current captain
            null,                // No next captain
            players,             // Available player pool loaded from Firebase
            new HashMap<>(),     // No teams
            null,                // No expiry time
            null,                // No last pick
            false,               // Draft not started
            new ArrayList<>()    // No captains
        );
    }

    public synchronized void makePick(String captainId, String playerId) {
        // Check if draft has started
        if (!state.draftStarted()) {
            throw new IllegalStateException("Draft has not started yet");
        }
        
        // validate captain turn
        if (!captainId.equals(state.currentCaptain())) {
            throw new IllegalStateException("Not your turn to pick");
        }
        
        // find the player in the available pool
        Player selectedPlayer = state.availablePool().stream()
            .filter(p -> p.getId().equals(playerId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Player not available"));
        
        // remove player from pool
        List<Player> updatedPool = new ArrayList<>(state.availablePool());
        updatedPool.removeIf(p -> p.getId().equals(playerId));
        
        // add to team
        Map<String, List<Player>> updatedTeams = new HashMap<>(state.teams());
        List<Player> captainTeam = new ArrayList<>(updatedTeams.getOrDefault(captainId, new ArrayList<>()));
        captainTeam.add(selectedPlayer);
        updatedTeams.put(captainId, captainTeam);
        
        // update state with next captain and reset timer
        Instant newExpiry = Instant.now().plusSeconds(60); // 1 minute to pick
        
        state = new DraftState(
            state.nextCaptain(),
            determineNextCaptain(state.nextCaptain(), updatedTeams.keySet()),
            updatedPool,
            updatedTeams,
            newExpiry,
            selectedPlayer,
            state.draftStarted(),
            state.captains()
        );
        
        // broadcast updated state
        broker.convertAndSend("/topic/draft", state);
    }

    public DraftState currentState() { 
        return state; 
    }

    @Scheduled(fixedRate = 1_000)
    void tick() {
        // Check if pickExpiresAt is not null before comparing
        if (state.pickExpiresAt() != null && state.pickExpiresAt().isBefore(Instant.now())) {
            autoSkip();
        }
    }
    
    private void autoSkip() {
        // Auto-select a random player when time expires
        if (state.availablePool().isEmpty()) {
            return; // Draft is complete
        }
        
        // Select first available player
        Player autoSelectedPlayer = state.availablePool().get(0);
        
        // Remove from pool
        List<Player> updatedPool = new ArrayList<>(state.availablePool());
        updatedPool.remove(0);
        
        // Add to team
        Map<String, List<Player>> updatedTeams = new HashMap<>(state.teams());
        String currentCaptain = state.currentCaptain();
        List<Player> captainTeam = new ArrayList<>(updatedTeams.getOrDefault(currentCaptain, new ArrayList<>()));
        captainTeam.add(autoSelectedPlayer);
        updatedTeams.put(currentCaptain, captainTeam);
        
        // Update state with next captain and reset timer
        Instant newExpiry = Instant.now().plusSeconds(60); // 1 minute to pick
        
        state = new DraftState(
            state.nextCaptain(),
            determineNextCaptain(state.nextCaptain(), updatedTeams.keySet()),
            updatedPool,
            updatedTeams,
            newExpiry,
            autoSelectedPlayer,
            state.draftStarted(),
            state.captains()
        );
        
        // Broadcast updated state
        broker.convertAndSend("/topic/draft", state);
    }
    
    private String determineNextCaptain(String currentCaptain, Iterable<String> captainIds) {
        // Get a list of captain IDs
        List<String> captainIdList = new ArrayList<>();
        captainIds.forEach(captainIdList::add);
        
        // If there are no captains, return the current one
        if (captainIdList.isEmpty()) {
            return currentCaptain;
        }
        
        // Find the index of the current captain
        int currentIndex = -1;
        for (int i = 0; i < captainIdList.size(); i++) {
            if (captainIdList.get(i).equals(currentCaptain)) {
                currentIndex = i;
                break;
            }
        }
        
        // If the current captain is not found, return the first captain
        if (currentIndex == -1) {
            return captainIdList.get(0);
        }
        
        // Return the next captain in the list, wrapping around if necessary
        return captainIdList.get((currentIndex + 1) % captainIdList.size());
    }

    // Method removed as it's no longer used
    
    /**
     * Initialize the draft with the given captains
     * @param captains the list of captains
     */
    public synchronized void initializeWithCaptains(List<Captain> captains) {
        if (captains.size() < 6) {
            logger.warn("Cannot initialize draft with fewer than 6 captains");
            return;
        }
        
        if (state.draftStarted()) {
            logger.warn("Draft has already started");
            return;
        }
        
        logger.info("Initializing draft with {} captains", captains.size());
        
        // Use existing players from state, or load them if needed
        List<Player> players = state.availablePool();
        if (players == null || players.isEmpty()) {
            logger.info("No players in state, loading from Firebase");
            players = loadPlayersFromFirebase();
        } else {
            logger.info("Using {} existing players from state", players.size());
        }
        
        // Create teams for each captain
        Map<String, List<Player>> teams = new HashMap<>();
        for (Captain captain : captains) {
            teams.put(captain.getUserId(), new ArrayList<>());
        }
        
        // Select the first and second captains
        String firstCaptainId = captains.get(0).getUserId();
        String secondCaptainId = captains.get(1).getUserId();
        
        // Create the new draft state
        state = new DraftState(
            firstCaptainId,           // First captain
            secondCaptainId,          // Next captain
            players,                  // Available player pool
            teams,                    // Teams (empty initially)
            Instant.now().plusSeconds(60),  // 1 minute for first pick
            null,                     // No last pick yet
            true,                     // Draft is started
            captains                  // List of captains
        );
        
        // Broadcast the updated state
        broker.convertAndSend("/topic/draft", state);
        logger.info("Draft initialized and started with {} captains and {} players", captains.size(), players.size());
    }
    
    /**
     * Load players from Firebase
     * @return a list of players
     */
    private List<Player> loadPlayersFromFirebase() {
        List<Player> players = new ArrayList<>();
        
        // If Firebase is available, try to load data from it
        if (firebaseApp != null) {
            try {
                logger.info("Firebase app is available, attempting to load players");
                logger.info("Credentials path: " + System.getenv("FIREBASE_CREDENTIALS_PATH"));
                
                // Get Firestore instance and use it directly
                FirestoreClient.getFirestore(firebaseApp).collection("users")
                  .whereEqualTo("registered2024", true)
                  .get()
                  .get() // This blocks until the query completes
                  .getDocuments()
                  .forEach(doc -> {
                      try {
                          logger.debug("Processing user document: " + doc.getId());
                          // Get the registered2025 value, defaulting to false if null
                          Boolean registered2025 = doc.getBoolean("registered2025");
                          boolean isRegistered2025 = (registered2025 != null) ? registered2025 : false;
                          
                          // Get position data - could be a string or an array
                          Object positionData = null;
                          // Only use position data if it's an array, as per requirement
                          if (doc.contains("position")) {
                              Object rawPosition = doc.get("position");
                              if (rawPosition instanceof List) {
                                  positionData = rawPosition;
                              }
                          }
                          
                          Player player = new Player(
                              doc.getId(),
                              doc.getString("firstName"),
                              doc.getString("lastName"),
                              positionData, // Pass the position object which could be null or a List
                              doc.getString("clubTeam"),
                              doc.getString("footPref"),
                              doc.getString("graduationYear"),
                              doc.getString("email"),
                              doc.getString("phone"),
                              doc.getString("nickname"),
                              // Set registered2024 to true since we're filtering for it
                              true,
                              // Use the processed registered2025 value
                              isRegistered2025
                          );
                          players.add(player);
                          logger.debug("Loaded player: " + player.getFullName());
                      } catch (Exception e) {
                          logger.error("Error parsing player data for " + doc.getId() + ": " + e.getMessage());
                          e.printStackTrace();
                      }
                  });
                
                logger.debug("Loaded " + players.size() + " registered players from Firebase");
            } catch (Exception e) {
                logger.error("Error loading data from Firebase: " + e.getMessage());
                e.printStackTrace();
            }
        } else {
            logger.warn("Firebase app is null, cannot load players from database");
        }
        
        // If no players were loaded from Firebase or if Firebase is not available,
        // use sample data
        if (players.isEmpty()) {
            System.out.println("No players loaded from Firebase, using sample data");
            // Create some sample data with the new Player structure including registration flags
            // For sample data, we'll use List positions to test the array format
            players.add(new Player("p1", "John", "Doe", Arrays.asList("ST"), "Team A", "right", "2024", "john@example.com", "555-1234", "Johnny", true, false));
            players.add(new Player("p2", "Jane", "Smith", Arrays.asList("CM", "AM"), "Team B", "left", "2025", "jane@example.com", "555-5678", "", true, false));
            players.add(new Player("p3", "Mike", "Johnson", Arrays.asList("CB", "RB"), "Team C", "right", "2023", "mike@example.com", "555-9012", "Mikey", true, false));
            players.add(new Player("p4", "Sarah", "Williams", Arrays.asList("GK"), "Team D", "right", "2024", "sarah@example.com", "555-3456", "", true, true));
            players.add(new Player("p5", "David", "Brown", Arrays.asList("ST", "RW"), "Team E", "left", "2025", "david@example.com", "555-7890", "Dave", true, true));
            players.add(new Player("p6", "Emily", "Davis", Arrays.asList("CM", "DM"), "Team F", "right", "2023", "emily@example.com", "555-2345", "", true, false));
        }
        
        return players;
    }
}
