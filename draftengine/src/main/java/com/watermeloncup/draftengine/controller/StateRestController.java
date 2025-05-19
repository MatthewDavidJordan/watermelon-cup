package com.watermeloncup.draftengine.controller;

import com.watermeloncup.draftengine.model.DraftState;
import com.watermeloncup.draftengine.service.DraftService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StateRestController {
    private final DraftService draft;
    
    public StateRestController(DraftService draft) { 
        this.draft = draft; 
    }
    
    @GetMapping("/state")
    public DraftState state() { 
        return draft.currentState(); 
    }
}
