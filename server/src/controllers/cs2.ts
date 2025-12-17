import { Elysia, t } from "elysia";
import {
  matchStateManager,
  playerStatsClient,
  GSIPayload,
} from "../services/cs2";

export const cs2Controller = (app: Elysia) =>
  app.group("/api/cs2", (app) =>
    app
      .post(
        "/gsi",
        async ({ body, set }) => {
          const payload = body as GSIPayload;
          const expectedToken =
            process.env.GSI_AUTH_TOKEN || "your_secret_token_here";

          if (!payload.auth || payload.auth.token !== expectedToken) {
            set.status = 401;
            return { success: false, error: "Invalid or missing auth token" };
          }

          // Only process competitive matches
          if (payload.map?.mode !== "competitive") {
            return {
              success: true,
              message: "Not a competitive match, ignoring",
            };
          }

          const mySteamId = process.env.STEAM_ID || "";
          matchStateManager.updateFromGSI(payload, mySteamId);

          // Fetch player stats asynchronously
          if (payload.allplayers) {
            const steamIds = Object.keys(payload.allplayers);

            // We don't await this to keep GSI response fast
            (async () => {
              for (const steamId of steamIds) {
                try {
                  const stats = await playerStatsClient.getPlayerStats(steamId);
                  matchStateManager.addPlayerStats(steamId, stats);
                } catch (e) {
                  console.error(`Failed to fetch stats for ${steamId}:`, e);
                }
              }
            })();
          }

          return { success: true, message: "GSI data received" };
        },
        {
          body: t.Object({
            auth: t.Optional(
              t.Object({
                token: t.String(),
              }),
            ),
            provider: t.Optional(t.Any()),
            map: t.Optional(t.Any()),
            player: t.Optional(t.Any()),
            allplayers: t.Optional(t.Any()),
            round: t.Optional(t.Any()),
          }),
          detail: {
            summary: "Receive CS2 GSI data",
            tags: ["CS2"],
          },
        },
      )
      .get(
        "/match",
        () => {
          const state = matchStateManager.getState();
          if (!state.is_active) {
            return { success: false, error: "No active match" };
          }
          return { success: true, data: state };
        },
        {
          detail: {
            summary: "Get current match state",
            tags: ["CS2"],
          },
        },
      )
      .post(
        "/match/clear",
        () => {
          matchStateManager.clear();
          return { success: true, message: "Match data cleared" };
        },
        {
          detail: {
            summary: "Clear current match data",
            tags: ["CS2"],
          },
        },
      ),
  );
