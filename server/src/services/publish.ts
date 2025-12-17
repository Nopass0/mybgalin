import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, stat, rename, rm, copyFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export enum JobStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Error = 'error',
}

export interface FrameSettings {
  enabled: boolean;
  style: string;
  color: string;
  weapon_name: string;
  skin_name: string;
  show_label: boolean;
}

export interface PublishJob {
  id: string;
  status: JobStatus;
  progress: number;
  error?: string;
  result_path?: string;
  result_size?: number;
  width?: number;
  height?: number;
  frame_count?: number;
  created_at: Date;
  expires_at: Date;
}

export class PublishService {
  private static jobs: Map<string, PublishJob> = new Map();
  private static tempDir = join(tmpdir(), 'bgalin_publish');

  static async init() {
    try {
      await mkdir(this.tempDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create temp directory:', e);
    }
  }

  static createJob(): PublishJob {
    const id = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    const job: PublishJob = {
      id,
      status: JobStatus.Pending,
      progress: 0,
      created_at: now,
      expires_at: expiresAt,
    };

    this.jobs.set(id, job);
    return job;
  }

  static getJob(id: string): PublishJob | undefined {
    return this.jobs.get(id);
  }

  static updateJob(id: string, update: Partial<PublishJob>) {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, ...update });
    }
  }

  static getJobDir(jobId: string): string {
    return join(this.tempDir, jobId);
  }

  static async cleanupExpired() {
    const now = new Date();
    for (const [id, job] of this.jobs.entries()) {
      if (job.expires_at < now) {
        try {
          await rm(this.getJobDir(id), { recursive: true, force: true });
          this.jobs.delete(id);
        } catch (e) {
          console.error(`Failed to cleanup job ${id}:`, e);
        }
      }
    }
  }

  private static runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
      let stderr = '';

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${command} failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  static async convertVideoToGif(
    jobId: string,
    inputPath: string,
    options: {
      start: number;
      duration: number;
      fps: number;
      scale: number;
      targetSize: number;
      optimization: string;
      skipFrames: number;
      frameSettings?: FrameSettings;
    }
  ) {
    const jobDir = this.getJobDir(jobId);
    await mkdir(jobDir, { recursive: true });

    const outputPath = join(jobDir, 'output.gif');
    const palettePath = join(jobDir, 'palette.png');

    this.updateJob(jobId, { status: JobStatus.Processing, progress: 10 });

    try {
      // Step 1: Generate palette
      const scaleFilter = options.scale < 100
        ? `scale=iw*${options.scale}/100:-1:flags=lanczos`
        : 'scale=iw:-1:flags=lanczos';

      const paletteFilters = `fps=${options.fps},${scaleFilter},palettegen=stats_mode=diff`;

      await this.runCommand('ffmpeg', [
        '-y',
        '-ss', options.start.toString(),
        '-t', options.duration.toString(),
        '-i', inputPath,
        '-vf', paletteFilters,
        palettePath
      ]);

      this.updateJob(jobId, { progress: 40 });

      // Step 2: Create GIF
      const gifFilters = `fps=${options.fps},${scaleFilter} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;

      await this.runCommand('ffmpeg', [
        '-y',
        '-ss', options.start.toString(),
        '-t', options.duration.toString(),
        '-i', inputPath,
        '-i', palettePath,
        '-filter_complex', gifFilters,
        '-loop', '0',
        outputPath
      ]);

      this.updateJob(jobId, { progress: 70 });

      // Step 3: Optimize if needed (simplified version of Rust logic)
      const stats = await stat(outputPath);
      if (stats.size > options.targetSize && options.optimization === 'smart') {
        // In a real scenario, we'd loop like in Rust, but here we just do one pass
        const optimizedPath = join(jobDir, 'optimized.gif');
        await this.runCommand('ffmpeg', [
          '-y',
          '-i', outputPath,
          '-vf', `select='not(mod(n,${options.skipFrames}))',setpts=N/FRAME_RATE/TB`,
          optimizedPath
        ]);
        await rename(optimizedPath, outputPath);
      }

      this.updateJob(jobId, { progress: 90 });

      // Step 4: Finalize
      const finalStats = await stat(outputPath);

      // Get info (simplified)
      this.updateJob(jobId, {
        status: JobStatus.Completed,
        progress: 100,
        result_path: outputPath,
        result_size: finalStats.size,
      });

      // Cleanup
      await rm(palettePath, { force: true });
      await rm(inputPath, { force: true });

    } catch (e: any) {
      this.updateJob(jobId, { status: JobStatus.Error, error: e.message });
      throw e;
    }
  }

  static async optimizeGif(
    jobId: string,
    inputPath: string,
    options: {
      targetSize: number;
      optimization: string;
      skipFrames: number;
      scale: number;
      frameSettings?: FrameSettings;
    }
  ) {
    const jobDir = this.getJobDir(jobId);
    await mkdir(jobDir, { recursive: true });

    const outputPath = join(jobDir, 'output.gif');
    this.updateJob(jobId, { status: JobStatus.Processing, progress: 20 });

    try {
      await copyFile(inputPath, outputPath);

      if (options.scale < 100) {
        const scaledPath = join(jobDir, 'scaled.gif');
        await this.runCommand('ffmpeg', [
          '-y',
          '-i', outputPath,
          '-vf', `scale=iw*${options.scale}/100:-1:flags=lanczos`,
          scaledPath
        ]);
        await rename(scaledPath, outputPath);
      }

      this.updateJob(jobId, { progress: 50 });

      const stats = await stat(outputPath);
      if (stats.size > options.targetSize) {
        const optimizedPath = join(jobDir, 'optimized.gif');
        await this.runCommand('ffmpeg', [
          '-y',
          '-i', outputPath,
          '-vf', `select='not(mod(n,${options.skipFrames}))',setpts=N/FRAME_RATE/TB`,
          optimizedPath
        ]);
        await rename(optimizedPath, outputPath);
      }

      this.updateJob(jobId, {
        status: JobStatus.Completed,
        progress: 100,
        result_path: outputPath,
        result_size: (await stat(outputPath)).size,
      });

      await rm(inputPath, { force: true });
    } catch (e: any) {
      this.updateJob(jobId, { status: JobStatus.Error, error: e.message });
      throw e;
    }
  }
}
