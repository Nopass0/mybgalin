import { Elysia } from 'elysia';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';

export const adminController = (app: Elysia) =>
    app
        .use(authMiddleware)
        .group('/api/admin', (app) =>
            app
                .get(
                    '/info',
                    async ({ user }) => {
                        return {
                            success: true,
                            data: {
                                message: 'You are authenticated as admin',
                                telegram_id: user?.telegram_id.toString(),
                                user_id: user?.id,
                            },
                        };
                    },
                    {
                        isAuthorized: true,
                        detail: {
                            summary: 'Get admin info',
                            tags: ['Admin'],
                        },
                    }
                )
                .get(
                    '/dashboard',
                    () => {
                        return {
                            success: true,
                            data: 'Welcome to admin dashboard',
                        };
                    },
                    {
                        isAuthorized: true,
                        detail: {
                            summary: 'Get admin dashboard',
                            tags: ['Admin'],
                        },
                    }
                )
                .get(
                    '/stats',
                    async () => {
                        const [totalSessions, activeSessions] = await Promise.all([
                            prisma.session.count(),
                            prisma.session.count({
                                where: {
                                    expires_at: {
                                        gt: new Date(),
                                    },
                                },
                            }),
                        ]);

                        return {
                            success: true,
                            data: {
                                total_sessions: totalSessions,
                                active_sessions: activeSessions,
                            },
                        };
                    },
                    {
                        isAuthorized: true,
                        detail: {
                            summary: 'Get admin stats',
                            tags: ['Admin'],
                        },
                    }
                )
        );
