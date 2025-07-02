package com.watermeloncup.draftengine.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.*;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.watermeloncup.draftengine.model.Captain;
import com.watermeloncup.draftengine.model.Player;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class GoogleSheetsService {
    private static final Logger logger = LoggerFactory.getLogger(GoogleSheetsService.class);
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Collections.singletonList(SheetsScopes.SPREADSHEETS);
    private static final String APPLICATION_NAME = "Watermelon Cup Draft Engine";
    
    @Value("${firebase.credentials.path:${FIREBASE_CREDENTIALS_PATH:}}")
    private String firebaseCredentialsPath;
    
    @Value("${firebase.credentials.base64:${FIREBASE_CREDENTIALS_BASE64:}}")
    private String firebaseCredentialsBase64;

    @Value("${sheets.spreadsheet.id:}")
    private String spreadsheetId;

    /**
     * Creates an authorized HttpRequestInitializer using the Firebase service account.
     * Supports loading credentials either from a file path or from a base64-encoded string.
     * @return An authorized HttpRequestInitializer object.
     * @throws IOException If the credentials cannot be found or read.
     */
    private HttpRequestInitializer getCredentials() throws IOException {
        GoogleCredentials credentials;
        
        // Try to load credentials from base64 string first
        if (firebaseCredentialsBase64 != null && !firebaseCredentialsBase64.isEmpty()) {
            logger.info("Loading Firebase service account credentials from base64 environment variable");
            try {
                byte[] decodedCredentials = Base64.getDecoder().decode(firebaseCredentialsBase64);
                try (InputStream credentialsStream = new ByteArrayInputStream(decodedCredentials)) {
                    credentials = ServiceAccountCredentials.fromStream(credentialsStream).createScoped(SCOPES);
                    return new HttpCredentialsAdapter(credentials);
                }
            } catch (IllegalArgumentException e) {
                logger.error("Failed to decode base64 credentials", e);
                // Fall through to try file path
            } catch (IOException e) {
                logger.error("Failed to load Firebase service account credentials from base64", e);
                // Fall through to try file path
            }
        }
        
        // If base64 didn't work or wasn't provided, try file path
        if (firebaseCredentialsPath != null && !firebaseCredentialsPath.isEmpty()) {
            logger.info("Loading Firebase service account credentials from file: {}", firebaseCredentialsPath);
            try (InputStream serviceAccountStream = Files.newInputStream(Paths.get(firebaseCredentialsPath))) {
                credentials = ServiceAccountCredentials.fromStream(serviceAccountStream).createScoped(SCOPES);
                return new HttpCredentialsAdapter(credentials);
            } catch (IOException e) {
                logger.error("Failed to load Firebase service account credentials from file", e);
                throw e;
            }
        }
        
        // If we get here, neither method worked
        throw new FileNotFoundException("Firebase credentials not available. Please set either FIREBASE_CREDENTIALS_PATH or FIREBASE_CREDENTIALS_BASE64 environment variable.");
    }

    /**
     * Export teams to Google Sheets after draft completion
     * @param teams Map of captain IDs to their drafted players
     * @param captains List of all captains
     * @return URL of the created spreadsheet
     */
    public String exportTeamsToSheet(Map<String, List<Player>> teams, List<Captain> captains) {
        try {
            // Set up the Sheets service
            final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
            Sheets service = new Sheets.Builder(HTTP_TRANSPORT, JSON_FACTORY, getCredentials())
                    .setApplicationName(APPLICATION_NAME)
                    .build();

            // Create a new spreadsheet if ID is not provided
            if (spreadsheetId == null || spreadsheetId.isEmpty()) {
                // Create a new spreadsheet with the current date in the title
                String dateTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm"));
                Spreadsheet spreadsheet = new Spreadsheet()
                        .setProperties(new SpreadsheetProperties()
                                .setTitle("Watermelon Cup Draft Results - " + dateTime));
                
                spreadsheet = service.spreadsheets().create(spreadsheet).execute();
                spreadsheetId = spreadsheet.getSpreadsheetId();
                logger.info("Created new spreadsheet with ID: {}", spreadsheetId);
            }

            // Get existing sheets to avoid duplicates
            Spreadsheet spreadsheet = service.spreadsheets().get(spreadsheetId).execute();
            List<Sheet> existingSheets = spreadsheet.getSheets();
            Set<String> existingSheetTitles = new HashSet<>();
            Set<Integer> existingSheetIds = new HashSet<>();
            
            for (Sheet sheet : existingSheets) {
                SheetProperties props = sheet.getProperties();
                existingSheetTitles.add(props.getTitle());
                existingSheetIds.add(props.getSheetId());
            }
            
            // Create a single draft results sheet
            List<Request> requests = new ArrayList<>();
            int sheetIndex = 1; // Start from 1 to avoid conflicts
            
            // Check if Draft Results sheet exists, if not create it
            String sheetTitle = "Draft Results";
            if (!existingSheetTitles.contains(sheetTitle)) {
                // Find an available sheet ID
                while (existingSheetIds.contains(sheetIndex)) {
                    sheetIndex++;
                }
                
                requests.add(new Request()
                        .setAddSheet(new AddSheetRequest()
                                .setProperties(new SheetProperties()
                                        .setTitle(sheetTitle)
                                        .setSheetId(sheetIndex++))));
            }

            // Execute batch update to create sheet if needed
            if (!requests.isEmpty()) {
                BatchUpdateSpreadsheetRequest batchRequest = new BatchUpdateSpreadsheetRequest().setRequests(requests);
                service.spreadsheets().batchUpdate(spreadsheetId, batchRequest).execute();
            }
            
            // Create a single sheet with teams as columns
            // First, determine the maximum number of players on any team
            int maxPlayers = 0;
            for (Captain captain : captains) {
                List<Player> teamPlayers = teams.getOrDefault(captain.getUserId(), new ArrayList<>());
                maxPlayers = Math.max(maxPlayers, teamPlayers.size());
            }
            
            // Create the header row with team names
            List<List<Object>> draftData = new ArrayList<>();
            List<Object> headerRow = new ArrayList<>();
            headerRow.add("Round"); // First column is the round number
            
            // Create a map to store team data by column index
            Map<Integer, List<Player>> teamPlayersByColumn = new HashMap<>();
            int columnIndex = 1; // Start from column B (index 1)
            
            for (Captain captain : captains) {
                String teamHeader = captain.getTeamName() + "\n(" + captain.getFullName() + ")";
                headerRow.add(teamHeader);
                
                // Store the team's players for later
                List<Player> teamPlayers = teams.getOrDefault(captain.getUserId(), new ArrayList<>());
                teamPlayersByColumn.put(columnIndex, teamPlayers);
                columnIndex++;
            }
            
            draftData.add(headerRow);
            
            // Add player rows in draft order
            for (int round = 0; round < maxPlayers; round++) {
                List<Object> playerRow = new ArrayList<>();
                playerRow.add(round + 1); // Round number (1-indexed)
                
                // Add player for each team in this round
                for (int col = 0; col < captains.size(); col++) {
                    List<Player> teamPlayers = teamPlayersByColumn.get(col + 1);
                    if (round < teamPlayers.size()) {
                        Player player = teamPlayers.get(round);
                        playerRow.add(player.getFullName() + "\n" + player.getPosition());
                    } else {
                        playerRow.add(""); // Empty cell if team didn't pick in this round
                    }
                }
                
                draftData.add(playerRow);
            }
            
            // Write the data to the sheet
            ValueRange draftBody = new ValueRange().setValues(draftData);
            service.spreadsheets().values()
                    .update(spreadsheetId, "Draft Results!A1", draftBody)
                    .setValueInputOption("RAW")
                    .execute();
            
            // Format the sheet to make it more readable
            List<Request> formatRequests = new ArrayList<>();
            
            // Auto-resize columns
            for (int i = 0; i < captains.size() + 1; i++) { // +1 for the round column
                formatRequests.add(new Request()
                        .setAutoResizeDimensions(new AutoResizeDimensionsRequest()
                                .setDimensions(new DimensionRange()
                                        .setSheetId(0) // Assuming the first sheet
                                        .setDimension("COLUMNS")
                                        .setStartIndex(i)
                                        .setEndIndex(i + 1))));
            }
            
            // Bold the header row
            formatRequests.add(new Request()
                    .setRepeatCell(new RepeatCellRequest()
                            .setRange(new GridRange()
                                    .setSheetId(0)
                                    .setStartRowIndex(0)
                                    .setEndRowIndex(1))
                            .setCell(new CellData()
                                    .setUserEnteredFormat(new CellFormat()
                                            .setTextFormat(new TextFormat()
                                                    .setBold(true))))
                            .setFields("userEnteredFormat.textFormat.bold")));
            
            // Apply formatting
            if (!formatRequests.isEmpty()) {
                BatchUpdateSpreadsheetRequest formatBatchRequest = new BatchUpdateSpreadsheetRequest().setRequests(formatRequests);
                service.spreadsheets().batchUpdate(spreadsheetId, formatBatchRequest).execute();
            }

            // Return the URL to the spreadsheet
            return "https://docs.google.com/spreadsheets/d/" + spreadsheetId;
        } catch (IOException | GeneralSecurityException e) {
            logger.error("Error exporting teams to Google Sheets", e);
            return null;
        }
    }
}
