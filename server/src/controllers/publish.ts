import { Elysia, t } from 'elysia';
import { PublishService, JobStatus } from '../services/publish';
import { join } from 'path';
import { writeFile } from 'fs/promises';

export const publishController = (app: Elysia) =>
    app.group('/api/studio/publish', (app) =>
        app
            /**
             * Convert video to GIF
             */
            .post(
                '/convert',
                async ({ body, set }) => {
                    const job = PublishService.createJob();
                    const jobDir = PublishService.getJobDir(job.id);

                    try {
                        await Bun.write(join(jobDir, 'input'), body.file);

                        // Start background task
                        PublishService.convertVideoToGif(job.id, join(jobDir, 'input'), {
                            start: Number(body.start || 0),
                            duration: Number(body.duration || 10),
                            fps: Number(body.fps || 15),
                            scale: Number(body.scale || 100),
                            targetSize: Number(body.target_size || 2 * 1024 * 1024),
                            optimization: body.optimization || 'smart',
                            skipFrames: Number(body.skip_frames || 2),
                            frameSettings: body.frame_style ? {
                                enabled: true,
                                style: body.frame_style,
                                color: body.frame_color || '#ff6600',
                                weapon_name: body.weapon_name || 'AK-47',
                                skin_name: body.skin_name || 'Fire Serpent',
                                show_label: body.show_label === 'true' || body.show_label === true,
                            } : undefined
                        }).catch(err => console.error(`Job ${job.id} failed:`, err));

                        return { success: true, data: { jobId: job.id } };
                    } catch (error: any) {
                        set.status = 500;
                        return { success: false, error: `Failed to start job: ${error.message}` };
                    }
                },
                {
                    body: t.Object({
                        file: t.File(),
                        start: t.Optional(t.Any()),
                        duration: t.Optional(t.Any()),
                        fps: t.Optional(t.Any()),
                        scale: t.Optional(t.Any()),
                        target_size: t.Optional(t.Any()),
                        optimization: t.Optional(t.String()),
                        skip_frames: t.Optional(t.Any()),
                        frame_style: t.Optional(t.String()),
                        frame_color: t.Optional(t.String()),
                        weapon_name: t.Optional(t.String()),
                        skin_name: t.Optional(t.String()),
                        show_label: t.Optional(t.Any()),
                    }),
                    detail: { summary: 'Convert video to GIF', tags: ['Publish'] }
                }
            )

            /**
             * Optimize existing GIF
             */
            .post(
                '/optimize',
                async ({ body, set }) => {
                    const job = PublishService.createJob();
                    const jobDir = PublishService.getJobDir(job.id);

                    try {
                        await Bun.write(join(jobDir, 'input.gif'), body.file);

                        // Start background task
                        PublishService.optimizeGif(job.id, join(jobDir, 'input.gif'), {
                            targetSize: Number(body.target_size || 2 * 1024 * 1024),
                            optimization: body.optimization || 'smart',
                            skipFrames: Number(body.skip_frames || 2),
                            scale: Number(body.scale || 100),
                            frameSettings: body.frame_style ? {
                                enabled: true,
                                style: body.frame_style,
                                color: body.frame_color || '#ff6600',
                                weapon_name: body.weapon_name || 'AK-47',
                                skin_name: body.skin_name || 'Fire Serpent',
                                show_label: body.show_label === 'true' || body.show_label === true,
                            } : undefined
                        }).catch(err => console.error(`Job ${job.id} failed:`, err));

                        return { success: true, data: { jobId: job.id } };
                    } catch (error: any) {
                        set.status = 500;
                        return { success: false, error: `Failed to start job: ${error.message}` };
                    }
                },
                {
                    body: t.Object({
                        file: t.File(),
                        target_size: t.Optional(t.Any()),
                        optimization: t.Optional(t.String()),
                        skip_frames: t.Optional(t.Any()),
                        scale: t.Optional(t.Any()),
                        frame_style: t.Optional(t.String()),
                        frame_color: t.Optional(t.String()),
                        weapon_name: t.Optional(t.String()),
                        skin_name: t.Optional(t.String()),
                        show_label: t.Optional(t.Any()),
                    }),
                    detail: { summary: 'Optimize GIF', tags: ['Publish'] }
                }
            )

            /**
             * Get job status
             */
            .get(
                '/status/:jobId',
                ({ params: { jobId } }) => {
                    const job = PublishService.getJob(jobId);
                    if (!job) {
                        return {
                            status: 'not_found',
                            progress: 0,
                            error: 'Job not found'
                        };
                    }

                    return {
                        status: job.status,
                        progress: job.progress,
                        error: job.error,
                        size: job.result_size,
                        width: job.width,
                        height: job.height,
                        frame_count: job.frame_count,
                    };
                },
                {
                    detail: { summary: 'Get job status', tags: ['Publish'] }
                }
            )

            /**
             * Get result file
             */
            .get(
                '/result/:jobId',
                async ({ params: { jobId }, set }) => {
                    const job = PublishService.getJob(jobId);
                    if (!job || job.status !== JobStatus.Completed || !job.result_path) {
                        set.status = 404;
                        return 'Result not found or job not completed';
                    }

                    set.headers['content-type'] = 'image/gif';
                    return Bun.file(job.result_path);
                },
                {
                    detail: { summary: 'Get result GIF', tags: ['Publish'] }
                }
            )

            /**
             * Download result file
             */
            .get(
                '/download/:jobId',
                async ({ params: { jobId }, set }) => {
                    const job = PublishService.getJob(jobId);
                    if (!job || job.status !== JobStatus.Completed || !job.result_path) {
                        set.status = 404;
                        return 'Result not found or job not completed';
                    }

                    set.headers['content-type'] = 'image/gif';
                    set.headers['content-disposition'] = `attachment; filename="bgalin_${jobId}.gif"`;
                    return Bun.file(job.result_path);
                },
                {
                    detail: { summary: 'Download result GIF', tags: ['Publish'] }
                }
            )
    );
