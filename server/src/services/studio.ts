import { prisma } from '../db';
import { randomBytes, createHash } from 'crypto';

export interface SteamPlayer {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatarfull: string;
}

export class StudioService {
  /**
   * Generate a unique project ID
   */
  static generateProjectId(): string {
    const timestamp = Date.now().toString(16);
    const random = randomBytes(4).toString('hex');
    return `${timestamp}${random}`;
  }

  /**
   * Generate a secure session token
   */
  static generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Extract Steam ID from OpenID claimed_id
   */
  static extractSteamId(claimedId: string): string | null {
    const prefix = 'https://steamcommunity.com/openid/id/';
    if (claimedId.startsWith(prefix)) {
      return claimedId.substring(prefix.length);
    }
    return null;
  }

  /**
   * Fetch Steam player info
   */
  static async fetchSteamPlayer(apiKey: string, steamId: string): Promise<SteamPlayer> {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Steam API error: ${response.status}`);

    const data = await response.json() as any;
    const player = data.response.players[0];

    if (!player) throw new Error('Player not found');

    return {
      steamid: player.steamid,
      personaname: player.personaname,
      profileurl: player.profileurl,
      avatarfull: player.avatarfull,
    };
  }

  /**
   * Get or create studio user
   */
  static async getOrCreateUser(
    steamId: string,
    personaName: string,
    avatarUrl: string,
    profileUrl: string
  ) {
    return await prisma.studioUser.upsert({
      where: { steam_id: steamId },
      update: {
        persona_name: personaName,
        avatar_url: avatarUrl,
        profile_url: profileUrl,
      },
      create: {
        steam_id: steamId,
        persona_name: personaName,
        avatar_url: avatarUrl,
        profile_url: profileUrl,
      },
    });
  }

  /**
   * Create a session for user
   */
  static async createSession(userId: number): Promise<string> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await prisma.studioSession.create({
      data: {
        user_id: userId,
        token,
        expires_at: expiresAt,
      },
    });

    return token;
  }

  /**
   * Validate session token and get user
   */
  static async validateSession(token: string) {
    const session = await prisma.studioSession.findFirst({
      where: {
        token,
        expires_at: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    return session?.user || null;
  }

  /**
   * Get all projects for a user
   */
  static async getUserProjects(userId: number) {
    return await prisma.studioProject.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
    });
  }

  /**
   * Get a specific project
   */
  static async getProject(projectId: string, userId: number) {
    return await prisma.studioProject.findFirst({
      where: { id: projectId, user_id: userId },
    });
  }

  /**
   * Create a new project
   */
  static async createProject(
    userId: number,
    name: string,
    projectType: string,
    stickerType: string
  ) {
    const id = this.generateProjectId();
    return await prisma.studioProject.create({
      data: {
        id,
        user_id: userId,
        name,
        type: projectType,
        sticker_type: stickerType,
      },
    });
  }

  /**
   * Update a project
   */
  static async updateProject(
    projectId: string,
    userId: number,
    data: {
      name?: string;
      thumbnail?: string;
      data?: string;
    }
  ) {
    return await prisma.studioProject.update({
      where: { id: projectId, user_id: userId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Delete a project
   */
  static async deleteProject(projectId: string, userId: number) {
    const result = await prisma.studioProject.deleteMany({
      where: { id: projectId, user_id: userId },
    });
    return result.count > 0;
  }
}
