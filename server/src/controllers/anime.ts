import { Elysia } from 'elysia';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { AnimeService } from '../services/anime';

export const animeController = (app: Elysia) =>
    app
        .use(authMiddleware)
        .group('/api/anime', (app) =>
            app
                .get('/upcoming', async () => {
                    const animes = await prisma.animeAuction.findMany({
                        where: { watched: false },
                        orderBy: [
                            { date: 'asc' },
                            { id: 'asc' }
                        ]
                    });

                    return {
                        success: true,
                        data: animes.map(anime => ({
                            has_date: !!anime.date,
                            is_upcoming: true,
                            anime
                        }))
                    };
                }, {
                    isAuthorized: true,
                    detail: { summary: 'Get upcoming anime', tags: ['Anime'] }
                })
                .get('/watched', async () => {
                    const animes = await prisma.animeAuction.findMany({
                        where: { watched: true },
                        orderBy: { date: 'desc' }
                    });

                    return {
                        success: true,
                        data: animes.map(anime => ({
                            has_date: !!anime.date,
                            is_upcoming: false,
                            anime
                        }))
                    };
                }, {
                    isAuthorized: true,
                    detail: { summary: 'Get watched anime', tags: ['Anime'] }
                })
                .get('/sync/progress', async () => {
                    const progress = await prisma.animeSyncProgress.findFirst({
                        orderBy: { id: 'desc' }
                    });

                    return {
                        success: true,
                        data: progress ? {
                            ...progress,
                            current: Number(progress.current),
                            total: Number(progress.total)
                        } : null
                    };
                }, {
                    isAuthorized: true,
                    detail: { summary: 'Get sync progress', tags: ['Anime'] }
                })
                .post('/sync', async ({ set }) => {
                    const existing = await prisma.animeSyncProgress.findFirst({
                        where: { status: 'running' }
                    });

                    if (existing) {
                        set.status = 400;
                        return { success: false, error: 'Синхронизация уже выполняется' };
                    }

                    const progress = await prisma.animeSyncProgress.create({
                        data: {
                            status: 'running',
                            message: 'Начало синхронизации...',
                            started_at: new Date()
                        }
                    });

                    // Run sync task in background
                    AnimeService.runSyncTask(progress.id).catch(err => {
                        console.error('Anime sync task error:', err);
                        prisma.animeSyncProgress.update({
                            where: { id: progress.id },
                            data: {
                                status: 'error',
                                message: `Ошибка: ${err.message}`,
                                finished_at: new Date()
                            }
                        }).catch(console.error);
                    });

                    return { success: true, data: 'Синхронизация запущена' };
                }, {
                    isAuthorized: true,
                    detail: { summary: 'Start anime synchronization', tags: ['Anime'] }
                })
        );
