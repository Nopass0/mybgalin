import { Elysia, t } from 'elysia';
import { SyncService } from '../services/sync';
import { adminAuthMiddleware } from '../middleware/auth';
import { prisma } from '../db';

// API Key auth middleware for sync clients
const syncAuthMiddleware = (app: Elysia) =>
  app.derive(async ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return { syncFolder: null };
    }

    const folder = await SyncService.getFolderByKey(apiKey);
    return { syncFolder: folder };
  });

export const syncController = (app: Elysia) =>
    app
        .use(adminAuthMiddleware)
        .group('/api/sync', (app) =>
            app
                // ===== Admin routes (protected) =====
                .get('/folders', async () => {
                    const folders = await SyncService.listFolders();
                    return { success: true, data: { folders } };
                }, { isAdminAuthorized: true })
                .post('/folders', async ({ body }) => {
                    const folder = await SyncService.createFolder(body.name);
                    return { success: true, data: { folder } };
                }, {
                    isAdminAuthorized: true,
                    body: t.Object({ name: t.String() }),
                    detail: { summary: 'Create sync folder', tags: ['Sync'] }
                })
                .get('/folders/:id', async ({ params: { id } }) => {
                    const folder = await prisma.syncFolder.findUnique({
                        where: { id },
                        include: { files: true, clients: true }
                    });
                    if (!folder) return { success: false, error: 'Folder not found' };
                    return { success: true, data: { folder } };
                }, { isAdminAuthorized: true })
                .put('/folders/:id', async ({ params: { id }, body }) => {
                    await SyncService.renameFolder(id, body.name);
                    return { success: true, data: { renamed: true } };
                }, {
                    isAdminAuthorized: true,
                    body: t.Object({ name: t.String() }),
                    detail: { summary: 'Rename sync folder', tags: ['Sync'] }
                })
                .post('/folders/:id/regenerate-key', async ({ params: { id } }) => {
                    const apiKey = await SyncService.regenerateApiKey(id);
                    return { success: true, data: { apiKey } };
                }, { isAdminAuthorized: true, detail: { summary: 'Regenerate API key', tags: ['Sync'] } })
                .delete('/folders/:id', async ({ params: { id } }) => {
                    await SyncService.deleteFolder(id);
                    return { success: true, data: { deleted: true } };
                }, { isAdminAuthorized: true, detail: { summary: 'Delete sync folder', tags: ['Sync'] } })
                .delete('/clients/:id', async ({ params: { id } }) => {
                    await SyncService.deleteClient(id);
                    return { success: true, data: { deleted: true } };
                }, { isAdminAuthorized: true, detail: { summary: 'Delete sync client', tags: ['Sync'] } })

                // ===== Client sync routes (API key auth) =====
                .use(syncAuthMiddleware)
                .post('/register', async ({ syncFolder, body, set }) => {
                    if (!syncFolder) {
                        set.status = 401;
                        return { success: false, error: 'Invalid API key' };
                    }
                    const client = await SyncService.registerClient(syncFolder.id, body.device_name);
                    return { success: true, data: { clientId: client.id, folderId: syncFolder.id } };
                }, {
                    body: t.Object({ device_name: t.String() }),
                    detail: { summary: 'Register sync client', tags: ['Sync'] }
                })
                .post('/status', async ({ syncFolder, body, set }) => {
                    if (!syncFolder) {
                        set.status = 401;
                        return { success: false, error: 'Invalid API key' };
                    }
                    if (body.client_id) {
                        await SyncService.updateClientSyncTime(body.client_id).catch(() => {});
                    }
                    const diff = await SyncService.computeSyncDiff(syncFolder.id, body.files || []);
                    return { success: true, data: diff };
                }, {
                    body: t.Object({
                        client_id: t.String(),
                        files: t.Array(t.Object({
                            path: t.String(),
                            checksum: t.String(),
                            size: t.Number()
                        }))
                    }),
                    detail: { summary: 'Get sync status', tags: ['Sync'] }
                })
                .get('/files', async ({ syncFolder, set }) => {
                    if (!syncFolder) {
                        set.status = 401;
                        return { success: false, error: 'Invalid API key' };
                    }
                    const files = await SyncService.listFiles(syncFolder.id);
                    return { success: true, data: { files } };
                }, { detail: { summary: 'List files in sync folder', tags: ['Sync'] } })
                .post('/upload', async ({ syncFolder, query, body, set }) => {
                    if (!syncFolder) {
                        set.status = 401;
                        return { success: false, error: 'Invalid API key' };
                    }
                    const path = decodeURIComponent(query.path || '');
                    const name = path.split('/').pop() || path;
                    const data = Buffer.from(await body.arrayBuffer());
                    const mimeType = body.type || 'application/octet-stream';
                    const file = await SyncService.uploadFile(syncFolder.id, path, name, data, mimeType);
                    return { success: true, data: { file } };
                }, {
                    query: t.Object({ path: t.String() }),
                    body: t.Any(),
                    detail: { summary: 'Upload file to sync folder', tags: ['Sync'] }
                })
                .get('/download/:fileId', async ({ syncFolder, params: { fileId }, set }) => {
                    if (!syncFolder) {
                        set.status = 401;
                        return 'Unauthorized';
                    }
                    const file = await SyncService.getFileById(fileId);
                    if (!file || file.folder_id !== syncFolder.id) {
                        set.status = 404;
                        return 'File not found';
                    }
                    const data = await SyncService.getFileData(syncFolder.id, fileId);
                    set.headers['content-type'] = file.mime_type;
                    return data;
                }, { detail: { summary: 'Download file from sync folder', tags: ['Sync'] } })
                .delete('/files', async ({ syncFolder, query, set }) => {
                    if (!syncFolder) {
                        set.status = 401;
                        return { success: false, error: 'Invalid API key' };
                    }
                    const path = decodeURIComponent(query.path || '');
                    const deleted = await SyncService.deleteFile(syncFolder.id, path);
                    return { success: true, data: { deleted } };
                }, {
                    query: t.Object({ path: t.String() }),
                    detail: { summary: 'Delete file from sync folder', tags: ['Sync'] }
                })
        );
