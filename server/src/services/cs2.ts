export interface PlayerStats {
  steamid: string;
  nickname: string;
  avatar_url: string;
  steam_level?: number;
  cs2_hours?: number;
  faceit_level?: number;
  faceit_elo?: number;
  account_created?: string;
}

export interface MatchState {
  is_active: boolean;
  is_competitive: boolean;
  map_name?: string;
  mode?: string;
  round?: number;
  ct_score: number;
  t_score: number;
  players: Record<string, PlayerStats>;
  teammates: string[]; // SteamIDs
  opponents: string[]; // SteamIDs
  last_updated: number;
}

export interface GSIPayload {
  provider?: {
    name: string;
    appid: number;
    version: number;
    steamid: string;
    timestamp: number;
  };
  map?: {
    mode?: string;
    name?: string;
    phase?: string;
    round?: number;
    team_ct?: { score: number };
    team_t?: { score: number };
  };
  round?: {
    phase?: string;
  };
  player?: {
    steamid?: string;
    name?: string;
    team?: string;
  };
  allplayers?: Record<
    string,
    {
      name: string;
      team?: string;
      match_stats?: {
        kills?: number;
        assists?: number;
        deaths?: number;
        mvps?: number;
        score?: number;
      };
    }
  >;
  auth?: {
    token: string;
  };
}

export class PlayerStatsClient {
  private steamApiKey: string;
  private faceitApiKey?: string;

  constructor(steamApiKey: string, faceitApiKey?: string) {
    this.steamApiKey = steamApiKey;
    this.faceitApiKey = faceitApiKey;
  }

  async getPlayerStats(steamid: string): Promise<PlayerStats> {
    const summary = await this.getPlayerSummary(steamid);
    const steamLevel = await this.getSteamLevel(steamid).catch(() => undefined);
    const cs2Hours = await this.getGameHours(steamid, 730).catch(() => 0);

    let faceitStats = { level: undefined, elo: undefined };
    if (this.faceitApiKey) {
      faceitStats = await this.getFaceitStats(steamid).catch(() => ({
        level: undefined,
        elo: undefined,
      }));
    }

    return {
      steamid,
      nickname: summary.nickname,
      avatar_url: summary.avatar,
      steam_level: steamLevel,
      cs2_hours: cs2Hours,
      faceit_level: faceitStats.level,
      faceit_elo: faceitStats.elo,
      account_created: summary.created,
    };
  }

  private async getPlayerSummary(
    steamid: string,
  ): Promise<{ nickname: string; avatar: string; created?: string }> {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.steamApiKey}&steamids=${steamid}`;
    const response = await fetch(url);
    const data = (await response.json()) as any;
    const player = data.response.players[0];

    if (!player) throw new Error("Player not found");

    let created: string | undefined;
    if (player.timecreated) {
      created = new Date(player.timecreated * 1000).toISOString().split("T")[0];
    }

    return {
      nickname: player.personaname,
      avatar: player.avatarfull,
      created,
    };
  }

  private async getSteamLevel(steamid: string): Promise<number> {
    const url = `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${this.steamApiKey}&steamid=${steamid}`;
    const response = await fetch(url);
    const data = (await response.json()) as any;
    return data.response.player_level;
  }

  private async getGameHours(steamid: string, appid: number): Promise<number> {
    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${this.steamApiKey}&steamid=${steamid}&include_played_free_games=1`;
    const response = await fetch(url);
    const data = (await response.json()) as any;

    const games = data.response.games || [];
    const game = games.find((g: any) => g.appid === appid);

    return game ? game.playtime_forever / 60 : 0;
  }

  private async getFaceitStats(
    steamid: string,
  ): Promise<{ level?: number; elo?: number }> {
    const url = `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${steamid}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.faceitApiKey}`,
      },
    });

    if (!response.ok) return { level: undefined, elo: undefined };

    const data = (await response.json()) as any;
    const cs2 = data.games?.cs2;

    return {
      level: cs2?.skill_level,
      elo: cs2?.faceit_elo,
    };
  }
}

export class MatchStateManager {
  private state: MatchState;

  constructor() {
    this.state = this.getDefaultState();
  }

  private getDefaultState(): MatchState {
    return {
      is_active: false,
      is_competitive: false,
      ct_score: 0,
      t_score: 0,
      players: {},
      teammates: [],
      opponents: [],
      last_updated: 0,
    };
  }

  updateFromGSI(gsi: GSIPayload, mySteamId: string) {
    this.state.is_active = !!gsi.provider;
    this.state.is_competitive = gsi.map?.mode === "competitive";
    this.state.last_updated = gsi.provider?.timestamp || 0;

    if (gsi.map) {
      this.state.map_name = gsi.map.name;
      this.state.mode = gsi.map.mode;
      this.state.round = gsi.map.round;
      this.state.ct_score = gsi.map.team_ct?.score || 0;
      this.state.t_score = gsi.map.team_t?.score || 0;
    }

    if (gsi.allplayers) {
      const myTeam = gsi.player?.team;
      this.state.teammates = [];
      this.state.opponents = [];

      for (const [steamid, playerInfo] of Object.entries(gsi.allplayers)) {
        if (steamid === mySteamId) continue;

        if (myTeam && playerInfo.team) {
          if (playerInfo.team === myTeam) {
            this.state.teammates.push(steamid);
          } else {
            this.state.opponents.push(steamid);
          }
        }
      }
    }
  }

  addPlayerStats(steamid: string, stats: PlayerStats) {
    this.state.players[steamid] = stats;
  }

  getState(): MatchState {
    return { ...this.state };
  }

  clear() {
    this.state = this.getDefaultState();
  }
}

// Singleton instances for the app
export const matchStateManager = new MatchStateManager();
export const playerStatsClient = new PlayerStatsClient(
  process.env.STEAM_API_KEY || "",
  process.env.FACEIT_API_KEY,
);
