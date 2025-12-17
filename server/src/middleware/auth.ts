import { Elysia } from "elysia";
import { AuthService } from "../services/auth";
import { StudioService } from "../services/studio";

export const authMiddleware = (app: Elysia) =>
  app
    .derive(async ({ request }) => {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          user: null,
        };
      }

      const token = authHeader.split(" ")[1];
      const user = await AuthService.validateToken(token);

      return {
        user,
      };
    })
    .macro(({ onBeforeHandle }) => ({
      isAuthorized(value: boolean) {
        if (!value) return;

        onBeforeHandle(({ user, set }) => {
          if (!user) {
            set.status = 401;
            return {
              success: false,
              error: "Unauthorized",
            };
          }
        });
      },
    }));

export const adminAuthMiddleware = (app: Elysia) =>
  app
    .derive(async ({ request }) => {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { adminUser: null };
      }

      const token = authHeader.substring(7);
      const user = await StudioService.validateSession(token);

      if (!user) return { adminUser: null };

      const adminSteamId = (process.env.ADMIN_STEAM_ID || "").trim();
      if (user.steam_id.trim() !== adminSteamId) {
        return { adminUser: null, isNotAdmin: true };
      }

      return { adminUser: user };
    })
    .macro(({ onBeforeHandle }) => ({
      isAdminAuthorized(value: boolean) {
        if (!value) return;

        onBeforeHandle(({ adminUser, isNotAdmin, set }) => {
          if (isNotAdmin) {
            set.status = 403;
            return { success: false, error: "Not an admin" };
          }
          if (!adminUser) {
            set.status = 401;
            return { success: false, error: "Unauthorized" };
          }
        });
      },
    }));
