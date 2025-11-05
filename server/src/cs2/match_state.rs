use super::gsi::GSIPayload;
use super::players::PlayerStats;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchState {
    pub is_active: bool,
    pub is_competitive: bool,
    pub map_name: Option<String>,
    pub mode: Option<String>,
    pub round: Option<u32>,
    pub ct_score: u32,
    pub t_score: u32,
    pub players: HashMap<String, PlayerStats>,
    pub teammates: Vec<String>,   // SteamIDs
    pub opponents: Vec<String>,   // SteamIDs
    pub last_updated: u64,
}

impl Default for MatchState {
    fn default() -> Self {
        Self {
            is_active: false,
            is_competitive: false,
            map_name: None,
            mode: None,
            round: None,
            ct_score: 0,
            t_score: 0,
            players: HashMap::new(),
            teammates: Vec::new(),
            opponents: Vec::new(),
            last_updated: 0,
        }
    }
}

pub struct MatchStateManager {
    state: Arc<RwLock<MatchState>>,
}

impl MatchStateManager {
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(MatchState::default())),
        }
    }

    pub fn update_from_gsi(&self, gsi: &GSIPayload, my_steamid: &str) {
        let mut state = self.state.write();

        // Update basic match info
        state.is_active = gsi.provider.is_some();
        state.is_competitive = gsi.is_competitive();
        state.last_updated = gsi.provider.as_ref().map(|p| p.timestamp).unwrap_or(0);

        if let Some(map) = &gsi.map {
            state.map_name = map.name.clone();
            state.mode = map.mode.clone();
            state.round = map.round;
            state.ct_score = map.team_ct.as_ref().map(|t| t.score).unwrap_or(0);
            state.t_score = map.team_t.as_ref().map(|t| t.score).unwrap_or(0);
        }

        // Parse teammates and opponents
        if let Some(allplayers) = &gsi.allplayers {
            let my_team = gsi.player.as_ref().and_then(|p| p.team.clone());

            state.teammates.clear();
            state.opponents.clear();

            for (steamid, player_info) in allplayers {
                if steamid == my_steamid {
                    continue; // Skip self
                }

                if let Some(ref my_team_val) = my_team {
                    if let Some(ref player_team) = player_info.team {
                        if player_team == my_team_val {
                            state.teammates.push(steamid.clone());
                        } else {
                            state.opponents.push(steamid.clone());
                        }
                    }
                }
            }
        }
    }

    pub fn add_player_stats(&self, steamid: String, stats: PlayerStats) {
        let mut state = self.state.write();
        state.players.insert(steamid, stats);
    }

    pub fn get_state(&self) -> MatchState {
        self.state.read().clone()
    }

    pub fn clear(&self) {
        let mut state = self.state.write();
        *state = MatchState::default();
    }
}

impl Clone for MatchStateManager {
    fn clone(&self) -> Self {
        Self {
            state: Arc::clone(&self.state),
        }
    }
}
