package com.watermeloncup.draftengine.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record DraftState(
    // Captain identifiers (used for internal logic)
    String currentCaptainId,
    String nextCaptainId,
    // Captain names for display (used in the UI)
    String currentCaptain,
    String nextCaptain,
    List<Player> availablePool,
    Map<String, List<Player>> teams,
    Instant pickExpiresAt,
    Player lastPick,
    boolean draftStarted,
    List<Captain> captains,
    Map<String, Boolean> autoDraftPreferences
) {}
