import { prisma } from '../db';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const SYNC_STORAGE_DIR = 'sync_storage';

export interface FileStatus {
  path: string;
  checksum: string;
  size: number;
}

export interface SyncDiff {
  upload: string[];
  download: { id: string; path: string; checksum: string }[];
  delete: string[];
}

export class SyncService {
  /**
   * Initialize sync storage directory
   */
  static async init() {
    if (!existsSync(SYNC_STORAGE_DIR)) {
      await mkdir(SYNC_STORAGE_DIR, { recursive: true });
    }
    console.log('☁️  Sync storage initialized at:', SYNC_STORAGE_DIR);
  }

  private static getFolderDir(folderId: string): string {
    return join(SYNC_STORAGE_DIR, folderId);
  }

  private static getFilePath(folderId: string, fileId: string): string {
    return join(this.getFolderDir(folderId), fileId);
  }

  private static generateApiKey(): string {
    const key = crypto.randomUUID().replace(/-/g, '');
    return `sync_${key}`;
  }

  static computeChecksum(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  // ===== Folder operations =====

  static async createFolder(name: string) {
    const id = crypto.randomUUID();
    const apiKey = this.generateApiKey();

    // Create storage directory
    const folderDir = this.getFolderDir(id);
    await mkdir(folderDir, { recursive: true });

    return await prisma.syncFolder.create({
      data: { id, name, api_key: apiKey },
    });
  }

  static async getFolder(folderId: string) {
    return await prisma.syncFolder.findUnique({ where: { id: folderId } });
  }

  static async getFolderByKey(apiKey: string) {
    return await prisma.syncFolder.findUnique({ where: { api_key: apiKey } });
  }

  static async listFolders() {
    const folders = await prisma.syncFolder.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        files: true,
        clients: true,
      },
    });

    return folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      apiKey: folder.api_key,
      apiUrl: '/api/sync',
      fileCount: folder.files.length,
      totalSize: folder.files.reduce((sum, f) => sum + Number(f.size), 0),
      clientCount: folder.clients.length,
      createdAt: folder.created_at,
      updatedAt: folder.updated_at,
      clients: folder.clients.map(c => ({
        id: c.id,
        deviceName: c.device_name,
        lastSyncAt: c.last_sync_at,
        createdAt: c.created_at,
      })),
    }));
  }

  static async getFolderStats(folderId: string) {
    const [files, clientCount] = await Promise.all([
      prisma.syncFile.findMany({ where: { folder_id: folderId } }),
      prisma.syncClient.count({ where: { folder_id: folderId } }),
    ]);

    const fileCount = files.length;
    const totalSize = files.reduce((sum, f) => sum + Number(f.size), 0);

    return { fileCount, totalSize, clientCount };
  }

  static async renameFolder(folderId: string, name: string) {
    await prisma.syncFolder.update({
      where: { id: folderId },
      data: { name, updated_at: new Date() },
    });
    return true;
  }

  static async regenerateApiKey(folderId: string) {
    const newKey = this.generateApiKey();
    await prisma.syncFolder.update({
      where: { id: folderId },
      data: { api_key: newKey, updated_at: new Date() },
    });
    return newKey;
  }

  static async deleteFolder(folderId: string) {
    // Delete storage directory
    const folderDir = this.getFolderDir(folderId);
    if (existsSync(folderDir)) {
      await rm(folderDir, { recursive: true, force: true });
    }

    await prisma.syncFolder.delete({ where: { id: folderId } });
    return true;
  }

  // ===== Client operations =====

  static async registerClient(folderId: string, deviceName: string) {
    const id = crypto.randomUUID();
    return await prisma.syncClient.create({
      data: { id, folder_id: folderId, device_name: deviceName },
    });
  }

  static async listClients(folderId: string) {
    return await prisma.syncClient.findMany({
      where: { folder_id: folderId },
      orderBy: { created_at: 'desc' },
    });
  }

  static async updateClientSyncTime(clientId: string) {
    await prisma.syncClient.update({
      where: { id: clientId },
      data: { last_sync_at: new Date() },
    });
  }

  static async deleteClient(clientId: string) {
    await prisma.syncClient.delete({ where: { id: clientId } });
    return true;
  }

  // ===== File operations =====

  static async listFiles(folderId: string) {
    return await prisma.syncFile.findMany({
      where: { folder_id: folderId },
      orderBy: { path: 'asc' },
    });
  }

  static async getFile(folderId: string, path: string) {
    return await prisma.syncFile.findFirst({
      where: { folder_id: folderId, path },
    });
  }

  static async getFileById(fileId: string) {
    return await prisma.syncFile.findUnique({ where: { id: fileId } });
  }

  static async uploadFile(
    folderId: string,
    path: string,
    name: string,
    data: Buffer,
    mimeType: string
  ) {
    const checksum = this.computeChecksum(data);
    const size = BigInt(data.length);

    const existing = await this.getFile(folderId, path);

    let fileId: string;

    if (existing) {
      // Update existing file
      if (existing.checksum !== checksum) {
        await prisma.syncFile.update({
          where: { id: existing.id },
          data: {
            checksum,
            size,
            version: { increment: 1 },
            updated_at: new Date(),
          },
        });
      }
      fileId = existing.id;
    } else {
      // Create new file
      fileId = crypto.randomUUID();
      await prisma.syncFile.create({
        data: {
          id: fileId,
          folder_id: folderId,
          path,
          name,
          mime_type: mimeType,
          size,
          checksum,
        },
      });
    }

    // Save file data
    const filePath = this.getFilePath(folderId, fileId);
    await mkdir(join(filePath, '..'), { recursive: true });
    await writeFile(filePath, data);

    return await this.getFileById(fileId);
  }

  static async getFileData(folderId: string, fileId: string): Promise<Buffer> {
    const filePath = this.getFilePath(folderId, fileId);
    return await readFile(filePath);
  }

  static async deleteFile(folderId: string, path: string) {
    const file = await this.getFile(folderId, path);
    if (!file) return false;

    // Delete from storage
    const filePath = this.getFilePath(folderId, file.id);
    if (existsSync(filePath)) {
      await rm(filePath);
    }

    // Delete from database
    await prisma.syncFile.delete({ where: { id: file.id } });
    return true;
  }

  // ===== Sync operations =====

  static async computeSyncDiff(folderId: string, clientFiles: FileStatus[]): Promise<SyncDiff> {
    const serverFiles = await this.listFiles(folderId);

    const serverMap = new Map(serverFiles.map(f => [f.path, f]));
    const clientMap = new Map(clientFiles.map(f => [f.path, f]));

    const upload: string[] = [];
    const download: { id: string; path: string; checksum: string }[] = [];
    const deleteFiles: string[] = [];

    // Check client files
    for (const clientFile of clientFiles) {
      const serverFile = serverMap.get(clientFile.path);
      if (serverFile) {
        // File exists on both - check checksum
        if (clientFile.checksum !== serverFile.checksum) {
          // Different content - client needs to upload (assuming client is newer)
          upload.push(clientFile.path);
        }
      } else {
        // File only on client - needs to upload
        upload.push(clientFile.path);
      }
    }

    // Check server files
    for (const serverFile of serverFiles) {
      const clientFile = clientMap.get(serverFile.path);
      if (!clientFile) {
        // File only on server - client needs to download
        download.push({
          id: serverFile.id,
          path: serverFile.path,
          checksum: serverFile.checksum,
        });
      }
    }

    return { upload, download, delete: deleteFiles };
  }
}
