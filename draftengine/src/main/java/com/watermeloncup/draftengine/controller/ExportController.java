package com.watermeloncup.draftengine.controller;

import com.watermeloncup.draftengine.service.DraftService;
import com.watermeloncup.draftengine.service.GoogleSheetsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for exporting draft results to Google Sheets
 */
@RestController
public class ExportController {
    private static final Logger logger = LoggerFactory.getLogger(ExportController.class);
    
    private final DraftService draftService;
    private final GoogleSheetsService googleSheetsService;
    
    @Autowired
    public ExportController(DraftService draftService, GoogleSheetsService googleSheetsService) {
        this.draftService = draftService;
        this.googleSheetsService = googleSheetsService;
    }
    
    /**
     * Export the current draft teams to Google Sheets
     * @return Response with export status and URL if successful
     */
    @PostMapping("/api/export-teams")
    public ResponseEntity<Map<String, Object>> exportTeams() {
        logger.info("Received request to export teams to Google Sheets");
        Map<String, Object> response = new HashMap<>();
        
        // Check if draft is in progress
        if (!draftService.currentState().draftStarted()) {
            logger.warn("Cannot export teams: Draft has not started");
            response.put("success", false);
            response.put("message", "Draft has not started yet");
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            // Get the current draft state
            String sheetUrl = googleSheetsService.exportTeamsToSheet(
                draftService.currentState().teams(),
                draftService.currentState().captains()
            );
            
            if (sheetUrl != null) {
                logger.info("Teams exported successfully to: {}", sheetUrl);
                response.put("success", true);
                response.put("message", "Teams exported successfully");
                response.put("url", sheetUrl);
                
                // Broadcast the export completion to all clients
                Map<String, Object> exportInfo = new HashMap<>();
                exportInfo.put("status", "success");
                exportInfo.put("message", "Teams have been exported to Google Sheets.");
                exportInfo.put("url", sheetUrl);
                
                draftService.broadcastExportCompletion(exportInfo);
                
                return ResponseEntity.ok(response);
            } else {
                logger.error("Failed to export teams to Google Sheets");
                response.put("success", false);
                response.put("message", "Failed to export teams to Google Sheets");
                return ResponseEntity.internalServerError().body(response);
            }
        } catch (Exception e) {
            logger.error("Error exporting teams to Google Sheets", e);
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
