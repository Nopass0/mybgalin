import { Elysia, t } from 'elysia';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';

export const menuController = (app: Elysia) =>
    app
        .group('/api', (app) =>
            app
                // Public endpoint for sidebar visibility
                .get('/menu-settings', async () => {
                    const items = await prisma.menuSetting.findMany({
                        orderBy: { display_order: 'asc' }
                    });

                    const settings: Record<string, boolean> = {};
                    for (const item of items) {
                        settings[item.id] = item.is_visible;
                    }

                    return settings;
                }, {
                    detail: {
                        summary: 'Get menu visibility settings',
                        tags: ['Menu'],
                    }
                })
        )
        .use(authMiddleware)
        .group('/api/admin', (app) =>
            app
                // Get all menu items with full details (admin only)
                .get('/menu-items', async () => {
                    const items = await prisma.menuSetting.findMany({
                        orderBy: { display_order: 'asc' }
                    });

                    return {
                        success: true,
                        data: items
                    };
                }, {
                    isAuthorized: true,
                    detail: {
                        summary: 'Get all menu items (admin)',
                        tags: ['Menu'],
                    }
                })
                // Update menu settings (admin only)
                .put('/menu-settings', async ({ body }) => {
                    const { settings } = body;

                    await prisma.$transaction(
                        Object.entries(settings).map(([id, is_visible]) =>
                            prisma.menuSetting.update({
                                where: { id },
                                data: {
                                    is_visible,
                                    updated_at: new Date()
                                }
                            })
                        )
                    );

                    return {
                        success: true,
                        data: 'Menu settings updated'
                    };
                }, {
                    isAuthorized: true,
                    body: t.Object({
                        settings: t.Record(t.String(), t.Boolean())
                    }),
                    detail: {
                        summary: 'Update menu visibility settings (admin)',
                        tags: ['Menu'],
                    }
                })
        );
