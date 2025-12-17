import { Elysia, t } from 'elysia';
import { prisma } from '../db';
import { HhService } from '../services/hh';

export const jobsController = (app: Elysia) =>
    app
        // HH.ru OAuth callback (public)
        .get('/api/auth/hh/callback', async ({ query, set }) => {
            const { code, state, error } = query as any;
            
            if (error) {
                set.redirect = `/dashboard?error=${encodeURIComponent(error)}`;
                return;
            }

            if (!code) {
                set.redirect = `/dashboard?error=${encodeURIComponent('No auth code received')}`;
                return;
            }

            try {
                const clientId = process.env.HH_CLIENT_ID || '';
                const clientSecret = process.env.HH_CLIENT_SECRET || '';
                const redirectUri = process.env.HH_REDIRECT_URI || 'https://bgalin.ru/api/auth/hh/callback';

                // Exchange code for token
                const tokenResponse = await fetch('https://hh.ru/oauth/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        client_id: clientId,
                        client_secret: clientSecret,
                        code,
                        redirect_uri: redirectUri,
                    }).toString(),
                });

                if (!tokenResponse.ok) {
                    throw new Error(`Token exchange failed: ${tokenResponse.status}`);
                }

                const tokenData = await tokenResponse.json();
                
                // Save HH credentials to database
                const settings = await prisma.jobSearchSettings.findFirst({ where: { id: 1 } });
                if (settings) {
                    await prisma.jobSearchSettings.update({
                        where: { id: 1 },
                        data: {
                            hh_access_token: tokenData.access_token,
                            hh_refresh_token: tokenData.refresh_token,
                            hh_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
                        }
                    });
                }

                set.redirect = '/dashboard?success=hh_connected';
            } catch (error: any) {
                console.error('HH OAuth error:', error);
                set.redirect = `/dashboard?error=${encodeURIComponent(error.message)}`;
            }
        }, {
            query: t.Object({
                code: t.Optional(t.String()),
                state: t.Optional(t.String()),
                error: t.Optional(t.String()),
            }),
            detail: { summary: 'HH.ru OAuth callback', tags: ['Jobs', 'Auth'] }
        })
        .group('/api/jobs', (app) =>
        app
            .get('/stats', async () => {
                const stats = await prisma.jobSearchStats.findMany({
                    orderBy: { date: 'desc' },
                    take: 30
                });
                return stats;
            })
            .get('/settings', async () => {
                const settings = await prisma.jobSearchSettings.findFirst({ where: { id: 1 } });
                return settings;
            })
            .put('/settings', async ({ body }) => {
                const settings = await prisma.jobSearchSettings.update({
                    where: { id: 1 },
                    data: body as any
                });
                return settings;
            })
            .get('/vacancies', async ({ query }) => {
                const page = Number(query.page) || 1;
                const limit = Number(query.limit) || 20;
                const status = query.status as string;

                const where: any = {};
                if (status) where.status = status;

                const [items, total] = await Promise.all([
                    prisma.jobVacancy.findMany({
                        where,
                        orderBy: { found_at: 'desc' },
                        skip: (page - 1) * limit,
                        take: limit
                    }),
                    prisma.jobVacancy.count({ where })
                ]);

                return {
                    items,
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                };
            })
            .get('/vacancies/:id', async ({ params: { id } }) => {
                const vacancy = await prisma.jobVacancy.findUnique({
                    where: { id: Number(id) },
                    include: {
                        responses: true,
                        chats: {
                            include: {
                                messages: {
                                    orderBy: { created_at: 'asc' }
                                }
                            }
                        }
                    }
                });
                return vacancy;
            })
            .get('/logs', async ({ query }) => {
                 const page = Number(query.page) || 1;
                 const limit = Number(query.limit) || 50;
                 
                  const [items, total] = await Promise.all([
                    prisma.jobActivityLog.findMany({
                        orderBy: { created_at: 'desc' },
                        skip: (page - 1) * limit,
                        take: limit
                    }),
                    prisma.jobActivityLog.count()
                ]);
                 return { items, total };
            })
    );
