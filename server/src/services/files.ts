import { prisma } from '../db';
import { mkdir, writeFile, readFile, rm, stat } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { existsSync } from 'fs';

const FILES_DIR = 'uploads/files';

export class FileService {
  /**
   * Initialize the file storage directory
   */
  static async init() {
    if (!existsSync(FILES_DIR)) {
      await mkdir(FILES_DIR, { recursive: true });
    }
  }

  /**
   * Get storage path for a file
   */
  private static getStoragePath(fileId: string): string {
    return join(FILES_DIR, fileId);
  }

  /**
   * Hash access code
   */
  static hashAccessCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /**
   * Verify access code
   */
  static verifyAccessCode(storedHash: string, providedCode: string): boolean {
    const providedHash = this.hashAccessCode(providedCode);
    return storedHash === providedHash;
  }

  /**
   * Create a new folder
   */
  static async createFolder(name: string, parentId?: string | null) {
    const id = crypto.randomUUID();
    return await prisma.fileFolder.create({
      data: {
        id,
        name,
        parent_id: parentId || null,
      },
    });
  }

  /**
   * Get folder contents
   */
  static async getFolderContents(folderId?: string | null) {
    const folder = folderId
      ? await prisma.fileFolder.findUnique({ where: { id: folderId } })
      : null;

    const folders = await prisma.fileFolder.findMany({
      where: { parent_id: folderId || null },
      orderBy: { name: 'asc' },
    });

    const files = await prisma.storedFile.findMany({
      where: { folder_id: folderId || null },
      orderBy: { name: 'asc' },
    });

    // Build breadcrumbs
    const breadcrumbs = [];
    let currentId = folderId;
    while (currentId) {
      const f = await prisma.fileFolder.findUnique({ where: { id: currentId } });
      if (f) {
        breadcrumbs.unshift(f);
        currentId = f.parent_id;
      } else {
        break;
      }
    }

    return {
      folder,
      folders,
      files,
      breadcrumbs,
    };
  }

  /**
   * Upload a file
   */
  static async uploadFile(
    name: string,
    data: Buffer,
    mimeType: string,
    folderId?: string | null,
    isPublic: boolean = false,
    accessCode?: string | null
  ) {
    const id = crypto.randomUUID();
    const filePath = this.getStoragePath(id);

    await writeFile(filePath, data);

    const hashedCode = accessCode ? this.hashAccessCode(accessCode) : null;

    return await prisma.storedFile.create({
      data: {
        id,
        name,
        path: filePath,
        folder_id: folderId || null,
        mime_type: mimeType,
        size: BigInt(data.length),
        is_public: isPublic,
        access_code: hashedCode,
      },
    });
  }

  /**
   * Get file data
   */
  static async getFileData(fileId: string): Promise<Buffer> {
    const path = this.getStoragePath(fileId);
    return await readFile(path);
  }

  /**
   * Update file
   */
  static async updateFile(
    fileId: string,
    data: {
      name?: string;
      is_public?: boolean;
      access_code?: string | null;
      folder_id?: string | null;
    }
  ) {
    const updateData: any = { ...data };
    if (data.access_code !== undefined) {
      updateData.access_code = data.access_code ? this.hashAccessCode(data.access_code) : null;
    }

    return await prisma.storedFile.update({
      where: { id: fileId },
      data: {
        ...updateData,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Delete file
   */
  static async deleteFile(fileId: string) {
    const path = this.getStoragePath(fileId);
    if (existsSync(path)) {
      await rm(path);
    }

    await prisma.storedFile.delete({ where: { id: fileId } });
    return true;
  }

  /**
   * Delete folder recursively
   */
  static async deleteFolder(folderId: string) {
    // Get all files in folder
    const files = await prisma.storedFile.findMany({ where: { folder_id: folderId } });
    for (const file of files) {
      await this.deleteFile(file.id);
    }

    // Get all subfolders
    const subfolders = await prisma.fileFolder.findMany({ where: { parent_id: folderId } });
    for (const sub of subfolders) {
      await this.deleteFolder(sub.id);
    }

    // Delete folder record
    await prisma.fileFolder.delete({ where: { id: folderId } });
    return true;
  }

  /**
   * Rename folder
   */
  static async renameFolder(folderId: string, newName: string) {
    return await prisma.fileFolder.update({
      where: { id: folderId },
      data: { name: newName, updated_at: new Date() },
    });
  }
}
