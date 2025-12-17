import { Elysia, t } from 'elysia';
import { FileService } from '../services/files';
import { adminAuthMiddleware } from '../middleware/auth';
import { prisma } from '../db';

export const filesController = (app: Elysia) =>
    app
        .use(adminAuthMiddleware)
        .group('/api/files', (app) =>
            app
                /**
                 * Admin routes (protected)
                 */
                .get('/folders', async ({ query: { folder_id } }) => {
                    const contents = await FileService.getFolderContents(folder_id);
                    return { success: true, data: contents };
                }, {
                    isAdminAuthorized: true,
                    query: t.Object({ folder_id: t.Optional(t.String()) }),
                    detail: { summary: 'Get folder contents', tags: ['Files'] }
                })
                .post('/folders', async ({ body }) => {
                    const folder = await FileService.createFolder(body.name, body.parent_id);
                    return { success: true, data: { folder } };
                }, {
                    isAdminAuthorized: true,
                    body: t.Object({
                        name: t.String(),
                        parent_id: t.Optional(t.String())
                    }),
                    detail: { summary: 'Create folder', tags: ['Files'] }
                })
                .put('/folders/:id', async ({ params: { id }, body }) => {
                    const folder = await FileService.renameFolder(id, body.name);
                    return { success: true, data: { folder } };
                }, {
                    isAdminAuthorized: true,
                    body: t.Object({ name: t.String() }),
                    detail: { summary: 'Rename folder', tags: ['Files'] }
                })
                .delete('/folders/:id', async ({ params: { id } }) => {
                    await FileService.deleteFolder(id);
                    return { success: true, data: { deleted: true } };
                }, {
                    isAdminAuthorized: true,
                    detail: { summary: 'Delete folder', tags: ['Files'] }
                })
                .post('/upload', async ({ body }) => {
                    const fileData = Buffer.from(await body.file.arrayBuffer());
                    const file = await FileService.uploadFile(
                        body.file.name,
                        fileData,
                        body.file.type,
                        body.folderId,
                        body.isPublic === 'true' || body.isPublic === true,
                        body.accessCode
                    );
                    return { success: true, data: { file } };
                }, {
                    isAdminAuthorized: true,
                    body: t.Object({
                        file: t.File(),
                        folderId: t.Optional(t.String()),
                        isPublic: t.Optional(t.Any()),
                        accessCode: t.Optional(t.String())
                    }),
                    detail: { summary: 'Upload file', tags: ['Files'] }
                })
                .put('/:id', async ({ params: { id }, body }) => {
                    const file = await FileService.updateFile(id, body);
                    return { success: true, data: { file } };
                }, {
                    isAdminAuthorized: true,
                    body: t.Object({
                        name: t.Optional(t.String()),
                        is_public: t.Optional(t.Boolean()),
                        access_code: t.Optional(t.Nullable(t.String())),
                        folder_id: t.Optional(t.Nullable(t.String()))
                    }),
                    detail: { summary: 'Update file', tags: ['Files'] }
                })
                .delete('/:id', async ({ params: { id } }) => {
                    await FileService.deleteFile(id);
                    return { success: true, data: { deleted: true } };
                }, {
                    isAdminAuthorized: true,
                    detail: { summary: 'Delete file', tags: ['Files'] }
                })
                .get('/info/:id', async ({ params: { id } }) => {
                    const file = await prisma.storedFile.findUnique({ where: { id } });
                    if (!file) return { success: false, error: 'File not found' };
                    return { success: true, data: { file } };
                }, {
                    isAdminAuthorized: true,
                    detail: { summary: 'Get file info', tags: ['Files'] }
                })

                /**
                 * Public routes
                 */
                .get('/public/:id', async ({ params: { id }, set }) => {
                    const file = await prisma.storedFile.findUnique({ where: { id } });
                    if (!file || !file.is_public) {
                        set.status = 404;
                        return 'File not found or private';
                    }

                    const data = await FileService.getFileData(id);
                    set.headers['content-type'] = file.mime_type;
                    return data;
                }, {
                    detail: { summary: 'Get public file', tags: ['Files'] }
                })
                .post('/private/:id', async ({ params: { id }, body, set }) => {
                    const file = await prisma.storedFile.findUnique({ where: { id } });
                    if (!file) {
                        set.status = 404;
                        return 'File not found';
                    }

                    if (!file.is_public) {
                        if (!file.access_code || !FileService.verifyAccessCode(file.access_code, body.code)) {
                            set.status = 403;
                            return 'Invalid access code';
                        }
                    }

                    const data = await FileService.getFileData(id);
                    set.headers['content-type'] = file.mime_type;
                    return data;
                }, {
                    body: t.Object({ code: t.String() }),
                    detail: { summary: 'Get private file', tags: ['Files'] }
                })
                .get('/check/:id', async ({ params: { id } }) => {
                    const file = await prisma.storedFile.findUnique({ where: { id } });
                    if (!file) return { success: true, data: { exists: false } };

                    return {
                        success: true,
                        data: {
                            exists: true,
                            isPublic: file.is_public,
                            requiresCode: !!file.access_code && !file.is_public,
                            name: file.name,
                            mimeType: file.mime_type,
                            size: Number(file.size)
                        }
                    };
                }, {
                    detail: { summary: 'Check file status', tags: ['Files'] }
                })
                .get('/admin/:id', async ({ params: { id }, query: { token }, set }) => {
                    // Manual token validation for query param access
                    if (!token) {
                        set.status = 401;
                        return 'Unauthorized';
                    }

                    const { StudioService } = await import('../services/studio');
                    const user = await StudioService.validateSession(token);
                    const adminSteamId = (process.env.ADMIN_STEAM_ID || '').trim();

                    if (!user || user.steam_id.trim() !== adminSteamId) {
                        set.status = 403;
                        return 'Forbidden';
                    }

                    const file = await prisma.storedFile.findUnique({ where: { id } });
                    if (!file) {
                        set.status = 404;
                        return 'File not found';
                    }

                    const data = await FileService.getFileData(id);
                    set.headers['content-type'] = file.mime_type;
                    return data;
                }, {
                    query: t.Object({ token: t.String() }),
                    detail: { summary: 'Admin direct file access', tags: ['Files'] }
                })
        );
