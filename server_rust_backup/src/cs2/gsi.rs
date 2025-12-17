use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GSIPayload {
    pub provider: Option<Provider>,
    pub map: Option<Map>,
    pub round: Option<Round>,
    pub player: Option<Player>,
    pub allplayers: Option<HashMap<String, PlayerInfo>>,
    pub auth: Option<Auth>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Auth {
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub name: String,
    pub appid: u64,
    pub version: u64,
    pub steamid: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Map {
    pub mode: Option<String>,
    pub name: Option<String>,
    pub phase: Option<String>,
    pub round: Option<u32>,
    pub team_ct: Option<TeamScore>,
    pub team_t: Option<TeamScore>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamScore {
    pub score: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Round {
    pub phase: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub steamid: Option<String>,
    pub name: Option<String>,
    pub team: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerInfo {
    pub name: String,
    pub team: Option<String>,
    pub match_stats: Option<MatchStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchStats {
    pub kills: Option<u32>,
    pub assists: Option<u32>,
    pub deaths: Option<u32>,
    pub mvps: Option<u32>,
    pub score: Option<u32>,
}

impl GSIPayload {
    pub fn is_competitive(&self) -> bool {
        if let Some(map) = &self.map {
            if let Some(mode) = &map.mode {
                return mode == "competitive";
            }
        }
        false
    }

    pub fn get_all_steamids(&self) -> Vec<String> {
        let mut steamids = Vec::new();

        if let Some(allplayers) = &self.allplayers {
            for (steamid, _) in allplayers {
                steamids.push(steamid.clone());
            }
        }

        steamids
    }
}
