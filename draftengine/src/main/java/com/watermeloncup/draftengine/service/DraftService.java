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
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DraftService {
    private static final Logger logger = LoggerFactory.getLogger(DraftService.class);
    private final SimpMessagingTemplate broker;
    private DraftState state;
    private final FirebaseApp firebaseApp;
    private final GoogleSheetsService googleSheetsService;
    
    // No longer using players-per-team configuration as draft completion is now
    // determined solely by the availability of players in the pool
    
    private boolean draftCompleted = false;
    private String exportedSheetUrl = null;

    @Autowired
    public DraftService(SimpMessagingTemplate broker, @Autowired(required = false) FirebaseApp fb, GoogleSheetsService googleSheetsService) {
        this.broker = broker;
        this.firebaseApp = fb;
        this.googleSheetsService = googleSheetsService;

        // Load players from Firebase first
        List<Player> players = loadPlayersFromFirebase();
        logger.info("Loaded {} players during initialization", players.size());

        // Initialize with empty state but include available players
        this.state = new DraftState(
                null, // No current captain
                null, // No next captain
                null, // No current captain name
                null, // No next captain name
                players, // Available player pool loaded from Firebase
                new HashMap<>(), // No teams
                null, // No expiry time
                null, // No last pick
                false, // Draft not started
                new ArrayList<>(), // No captains
                new HashMap<>() // No autodraft preferences
        );
    }

    public synchronized void makePick(String captainId, String playerId) {
        // Check if draft has started
        if (!state.draftStarted()) {
            throw new IllegalStateException("Draft has not started yet");
        }

        // validate captain turn
        if (!captainId.equals(state.currentCaptainId())) {
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
        
        // Check if the draft is complete after this pick
        boolean isDraftComplete = checkIfDraftComplete(updatedPool, updatedTeams);

        // update state with next captain and reset timer
        Instant newExpiry = Instant.now().plusSeconds(180); // 3 minutes to pick

        // Get the next captain ID
        String nextCaptainId = state.nextCaptainId();
        String newNextCaptainId = determineNextCaptain(nextCaptainId, updatedTeams.keySet());

        // Find the captain objects to get their names
        String nextCaptainName = getCaptainName(nextCaptainId, state.captains());
        String newNextCaptainName = getCaptainName(newNextCaptainId, state.captains());

        state = new DraftState(
                nextCaptainId,
                newNextCaptainId,
                nextCaptainName,
                newNextCaptainName,
                updatedPool,
                updatedTeams,
                newExpiry,
                selectedPlayer,
                state.draftStarted(),
                state.captains(),
                state.autoDraftPreferences());

        // broadcast updated state
        broker.convertAndSend("/topic/draft", state);
        
        // If draft is complete, export teams to Google Sheets
        if (isDraftComplete && !draftCompleted) {
            exportTeamsToGoogleSheets();
        }
    }

    public DraftState currentState() {
        return state;
    }

    @Scheduled(fixedDelay = 1000) // Check every second
    public void checkPickExpiry() {
        // Check if current captain has autodraft enabled
        if (state.draftStarted() && state.currentCaptainId() != null) {
            Boolean autoDraftEnabled = state.autoDraftPreferences().getOrDefault(state.currentCaptainId(), false);
            if (autoDraftEnabled) {
                makeAutoDraftPick(state.currentCaptainId());
                return; // Skip the rest of the method since we've made a pick
            }
        }
        // Check if pickExpiresAt is not null before comparing
        if (state.pickExpiresAt() != null && state.pickExpiresAt().isBefore(Instant.now())) {
            autoSkip();
        }
    }

    /**
     * Set autodraft preference for a captain
     * 
     * @param captainId the captain's ID
     * @param enabled   whether autodraft is enabled
     */
    public synchronized void setAutoDraftPreference(String captainId, boolean enabled) {
        // Create a new map with existing preferences
        Map<String, Boolean> newPreferences = new HashMap<>(state.autoDraftPreferences());

        // Update the preference for this captain
        newPreferences.put(captainId, enabled);

        // Create new state with updated preferences
        this.state = new DraftState(
                state.currentCaptainId(),
                state.nextCaptainId(),
                state.currentCaptain(),
                state.nextCaptain(),
                state.availablePool(),
                state.teams(),
                state.pickExpiresAt(),
                state.lastPick(),
                state.draftStarted(),
                state.captains(),
                newPreferences);

        // Broadcast updated state
        broker.convertAndSend("/topic/draft", state);

        // If this is the current captain and autodraft is enabled, make an automatic
        // pick
        if (enabled && captainId.equals(state.currentCaptainId())) {
            makeAutoDraftPick(captainId);
        }
    }

    /**
     * Make an automatic pick for a captain with autodraft enabled
     * 
     * @param captainId the captain's ID
     */
    private void makeAutoDraftPick(String captainId) {
        // Only proceed if the captain has autodraft enabled and it's their turn
        if (!state.autoDraftPreferences().getOrDefault(captainId, false) ||
                !captainId.equals(state.currentCaptainId()) ||
                state.availablePool().isEmpty()) {
            return;
        }

        // Select the first available player
        Player player = state.availablePool().get(0);

        logger.info("Making autodraft pick for captain {}: {}", captainId,
                player.getFirstName() + " " + player.getLastName());

        try {
            // Make the pick
            makePick(captainId, player.getId());
        } catch (Exception e) {
            logger.error("Error making autodraft pick: {}", e.getMessage());
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
        String currentCaptainId = state.currentCaptainId();
        List<Player> captainTeam = new ArrayList<>(updatedTeams.getOrDefault(currentCaptainId, new ArrayList<>()));
        captainTeam.add(autoSelectedPlayer);
        updatedTeams.put(currentCaptainId, captainTeam);

        // Check if the draft is complete after this auto-pick
        boolean isDraftComplete = checkIfDraftComplete(updatedPool, updatedTeams);

        // Update state with next captain and reset timer
        Instant newExpiry = Instant.now().plusSeconds(180); // 3 minutes to pick

        // Get the next captain ID
        String nextCaptainId = state.nextCaptainId();
        String newNextCaptainId = determineNextCaptain(nextCaptainId, updatedTeams.keySet());

        // Find the captain objects to get their names
        String nextCaptainName = getCaptainName(nextCaptainId, state.captains());
        String newNextCaptainName = getCaptainName(newNextCaptainId, state.captains());

        state = new DraftState(
                nextCaptainId,
                newNextCaptainId,
                nextCaptainName,
                newNextCaptainName,
                updatedPool,
                updatedTeams,
                newExpiry,
                autoSelectedPlayer,
                state.draftStarted(),
                state.captains(),
                state.autoDraftPreferences());

        // Broadcast updated state
        broker.convertAndSend("/topic/draft", state);
        
        // If draft is complete, export teams to Google Sheets
        if (isDraftComplete && !draftCompleted) {
            exportTeamsToGoogleSheets();
        }
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

    /**
     * Helper method to get a captain's full name from their ID
     * 
     * @param captainId the captain's user ID
     * @param captains  the list of captains
     * @return the captain's full name or their ID if not found
     */
    private String getCaptainName(String captainId, List<Captain> captains) {
        if (captainId == null)
            return null;

        return captains.stream()
                .filter(c -> captainId.equals(c.getUserId()))
                .findFirst()
                .map(c -> c.getFirstName() + " " + c.getLastName())
                .orElse(captainId); // Fallback to ID if captain not found
    }

    /**
     * Initialize the draft with the given captains
     * 
     * @param captains the list of captains
     */
    public synchronized void initializeWithCaptains(List<Captain> captains) {
        // Ensure we have exactly 6 captains
        if (captains.size() != 6) {
            logger.warn("Cannot initialize draft without exactly 6 captains. Current count: {}", captains.size());
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

        // Create fresh teams for each of the 6 captains
        Map<String, List<Player>> teams = new HashMap<>();
        for (Captain captain : captains) {
            teams.put(captain.getUserId(), new ArrayList<>());
        }

        // Randomize the captain order for fairness
        List<Captain> shuffledCaptains = new ArrayList<>(captains);
        Collections.shuffle(shuffledCaptains);

        // Select the first and second captains randomly
        String firstCaptainId = shuffledCaptains.get(0).getUserId();
        String secondCaptainId = shuffledCaptains.get(1).getUserId();

        // Get captain names for display
        String firstCaptainName = shuffledCaptains.get(0).getFirstName() + " " + shuffledCaptains.get(0).getLastName();
        String secondCaptainName = shuffledCaptains.get(1).getFirstName() + " " + shuffledCaptains.get(1).getLastName();

        logger.info("Randomly selected first captain: {} and second captain: {}", firstCaptainName, secondCaptainName);

        // Create the new draft state with only the current 6 captains
        state = new DraftState(
                firstCaptainId, // First captain ID
                secondCaptainId, // Next captain ID
                firstCaptainName, // First captain name
                secondCaptainName, // Next captain name
                players, // Available player pool
                teams, // Teams (empty initially)
                Instant.now().plusSeconds(180), // 3 minutes for first pick
                null, // No last pick yet
                true, // Draft is started
                captains, // List of captains (exactly 6)
                new HashMap<>() // Initialize empty autodraft preferences
        );

        // Broadcast the updated state
        broker.convertAndSend("/topic/draft", state);
        logger.info("Draft initialized and started with exactly 6 captains and {} players", players.size());
    }

    /**
     * Load players from Firebase
     * 
     * @return a list of players
     */
    /**
     * Broadcast export completion status to all clients
     * @param exportInfo Map containing export status information
     */
    public void broadcastExportCompletion(Map<String, Object> exportInfo) {
        broker.convertAndSend("/topic/export-complete", exportInfo);
    }
    
    // These methods already exist elsewhere in the class, removing duplicates
    
    /**
     * Check if the draft is complete
     * @param availablePool the available player pool
     * @param teams the teams map
     * @return true if the draft is complete, false otherwise
     */
    private boolean checkIfDraftComplete(List<Player> availablePool, Map<String, List<Player>> teams) {
        // Draft is complete when there are no more players in the available pool
        
        // Check if pool is empty
        if (availablePool.isEmpty()) {
            logger.info("Draft complete: No more players in available pool");
            return true;
        }
        
        // Draft is not complete if there are still players available
        return false;
    }
    
    /**
     * Export teams to Google Sheets
     */
    private void exportTeamsToGoogleSheets() {
        logger.info("Exporting teams to Google Sheets");
        draftCompleted = true;
        
        try {
            // Export teams to Google Sheets
            String sheetUrl = googleSheetsService.exportTeamsToSheet(state.teams(), state.captains());
            
            if (sheetUrl != null) {
                exportedSheetUrl = sheetUrl;
                logger.info("Teams exported successfully to: {}", sheetUrl);
                
                // Broadcast the export completion to all clients
                Map<String, Object> exportInfo = new HashMap<>();
                exportInfo.put("status", "success");
                exportInfo.put("message", "Draft complete! Teams have been exported to Google Sheets.");
                exportInfo.put("url", sheetUrl);
                
                broker.convertAndSend("/topic/export-complete", exportInfo);
            } else {
                logger.error("Failed to export teams to Google Sheets");
                
                // Broadcast the export failure to all clients
                Map<String, Object> exportInfo = new HashMap<>();
                exportInfo.put("status", "error");
                exportInfo.put("message", "Failed to export teams to Google Sheets. Please contact an administrator.");
                
                broker.convertAndSend("/topic/export-complete", exportInfo);
            }
        } catch (Exception e) {
            logger.error("Error exporting teams to Google Sheets", e);
            
            // Broadcast the export error to all clients
            Map<String, Object> exportInfo = new HashMap<>();
            exportInfo.put("status", "error");
            exportInfo.put("message", "An error occurred while exporting teams: " + e.getMessage());
            
            broker.convertAndSend("/topic/export-complete", exportInfo);
        }
    }
    
    /**
     * Get the URL of the exported Google Sheet
     * @return the URL of the exported Google Sheet, or null if export hasn't happened yet
     */
    public String getExportedSheetUrl() {
        return exportedSheetUrl;
    }
    
    /**
     * Check if the draft is completed
     * @return true if the draft is completed, false otherwise
     */
    public boolean isDraftCompleted() {
        return draftCompleted;
    }
    
    private List<Player> loadPlayersFromFirebase() {
        List<Player> players = new ArrayList<>();

        // If Firebase is available, try to load data from it
        if (firebaseApp != null) {
            try {
                logger.info("Firebase app is available, attempting to load players");
                logger.info("Credentials path: " + System.getenv("FIREBASE_CREDENTIALS_PATH"));

                // Get Firestore instance and use it directly
                FirestoreClient.getFirestore(firebaseApp).collection("users")
                        .whereEqualTo("registered2025", true)
                        .get()
                        .get() // This blocks until the query completes
                        .getDocuments()
                        .forEach(doc -> {
                            try {
                                logger.debug("Processing user document: " + doc.getId());
                                // Get the registered2025 value, defaulting to false if null
                                Boolean registered2025 = doc.getBoolean("registered2025");
                                Boolean isRegistered2025 = (registered2025 != null) ? registered2025 : false;

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
                                        doc.getBoolean("registered2024") != null ? doc.getBoolean("registered2024")
                                                : false,
                                        // set registered2025 to true since we're loading only players with that value
                                        true);
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

        if (players.isEmpty()) {
            logger.warn("No players were loaded from Firebase. The player pool is empty.");
        }

        return players;
    }
}
