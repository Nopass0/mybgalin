import { Elysia } from 'elysia';

export const publicController = (app: Elysia) =>
    app.group('/api', (app) =>
        app
            .get('/', () => ({
                message: 'Bgalin API v2.0 - Running on Bun/Elysia',
                docs: '/swagger',
            }))
            .get('/health', () => ({
                status: 'ok',
                timestamp: new Date().toISOString(),
            }))
            .get('/server_time', () => ({
                server_time: new Date().toISOString(),
            }))
    );
