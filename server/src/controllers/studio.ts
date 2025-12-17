import { Elysia, t } from 'elysia';
import { StudioService } from '../services/studio';
import { prisma } from '../db';

export const studioController = (app: Elysia) =>
    app
        .group('/api/studio', (app) =>
            app
                /**
                 * Initiate Steam OpenID authentication
                 */
                .get('/auth/steam', ({ query: { return_url }, set }) => {
                    const realm = process.env.PUBLIC_URL || 'http://localhost:3000';
                    const returnTo = `${realm}/api/studio/auth/steam/callback?return_url=${return_url || ''}`;

                    const steamLoginUrl = `https://steamcommunity.com/openid/login?` +
                        `openid.ns=http://specs.openid.net/auth/2.0&` +
                        `openid.mode=checkid_setup&` +
                        `openid.return_to=${encodeURIComponent(returnTo)}&` +
                        `openid.realm=${encodeURIComponent(realm)}&` +
                        `openid.identity=http://specs.openid.net/auth/2.0/identifier_select&` +
                        `openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`;

                    set.redirect = steamLoginUrl;
                }, {
                    query: t.Object({
                        return_url: t.Optional(t.String())
                    }),
                    detail: { summary: 'Initiate Steam auth', tags: ['Studio'] }
                })

                /**
                 * Steam OpenID callback
                 */
                .get('/auth/steam/callback', async ({ query, set }) => {
                    const params = query as any;
                    const claimedId = params['openid.claimed_id'];
                    const returnUrl = params['return_url'] || '/studio';

                    if (!claimedId) {
                        set.redirect = `${returnUrl}?error=${encodeURIComponent('Invalid Steam response')}`;
                        return;
                    }

                    const steamId = StudioService.extractSteamId(claimedId);
                    if (!steamId) {
                        set.redirect = `${returnUrl}?error=${encodeURIComponent('Failed to extract Steam ID')}`;
                        return;
                    }

                    try {
                        const apiKey = process.env.STEAM_API_KEY || '';
                        const player = await StudioService.fetchSteamPlayer(apiKey, steamId);

                        const user = await StudioService.getOrCreateUser(
                            steamId,
                            player.personaname,
                            player.avatarfull,
                            player.profileurl
                        );

                        const token = await StudioService.createSession(user.id);

                        // Redirect back to the frontend with the token
                        set.redirect = `/studio/auth/callback?token=${token}&return_url=${encodeURIComponent(returnUrl)}`;
                    } catch (error: any) {
                        set.redirect = `${returnUrl}?error=${encodeURIComponent(error.message)}`;
                    }
                }, {
                    detail: { summary: 'Steam auth callback', tags: ['Studio'] }
                })

                /**
                 * Protected routes (require Studio session token)
                 */
                .derive(async ({ request }) => {
                    const authHeader = request.headers.get('Authorization');
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                        return { studioUser: null };
                    }

                    const token = authHeader.substring(7);
                    const user = await StudioService.validateSession(token);

                    return { studioUser: user };
                })
                .guard({
                    beforeHandle: ({ studioUser, set }) => {
                        if (!studioUser) {
                            set.status = 401;
                            return { success: false, error: 'Unauthorized' };
                        }
                    }
                }, (app) => app
                    .get('/auth/me', async ({ studioUser }) => {
                        const adminSteamId = (process.env.ADMIN_STEAM_ID || '').trim();
                        const isAdmin = adminSteamId !== '' && studioUser!.steam_id === adminSteamId;

                        return {
                            success: true,
                            data: {
                                user: {
                                    id: studioUser!.id,
                                    steam_id: studioUser!.steam_id,
                                    persona_name: studioUser!.persona_name,
                                    avatar_url: studioUser!.avatar_url,
                                    profile_url: studioUser!.profile_url,
                                    created_at: studioUser!.created_at
                                },
                                isAdmin
                            }
                        };
                    }, {
                        detail: { summary: 'Get current user info', tags: ['Studio'] }
                    })
                    .get('/projects', async ({ studioUser }) => {
                        const projects = await StudioService.getUserProjects(studioUser!.id);
                        return { success: true, data: { projects } };
                    }, {
                        detail: { summary: 'Get all user projects', tags: ['Studio'] }
                    })
                    .post('/projects', async ({ studioUser, body }) => {
                        const project = await StudioService.createProject(
                            studioUser!.id,
                            body.name,
                            body.project_type,
                            body.sticker_type
                        );
                        return { success: true, data: { project } };
                    }, {
                        body: t.Object({
                            name: t.String(),
                            project_type: t.String(),
                            sticker_type: t.String()
                        }),
                        detail: { summary: 'Create a new project', tags: ['Studio'] }
                    })
                    .get('/projects/:id', async ({ studioUser, params: { id } }) => {
                        const project = await StudioService.getProject(id, studioUser!.id);
                        if (!project) return { success: false, error: 'Project not found' };
                        return { success: true, data: { project } };
                    }, {
                        detail: { summary: 'Get a specific project', tags: ['Studio'] }
                    })
                    .put('/projects/:id', async ({ studioUser, params: { id }, body }) => {
                        try {
                            const project = await StudioService.updateProject(id, studioUser!.id, body);
                            return { success: true, data: { project } };
                        } catch (error) {
                            return { success: false, error: 'Project not found or update failed' };
                        }
                    }, {
                        body: t.Object({
                            name: t.Optional(t.String()),
                            thumbnail: t.Optional(t.String()),
                            data: t.Optional(t.String())
                        }),
                        detail: { summary: 'Update a project', tags: ['Studio'] }
                    })
                    .delete('/projects/:id', async ({ studioUser, params: { id } }) => {
                        const deleted = await StudioService.deleteProject(id, studioUser!.id);
                        if (!deleted) return { success: false, error: 'Project not found' };
                        return { success: true, data: { deleted: true } };
                    }, {
                        detail: { summary: 'Delete a project', tags: ['Studio'] }
                    })
                )
        );
