import { Elysia } from 'elysia';

export const publicController = (app: Elysia) =>
    app.group('/', (app) =>
        app
            .get('/', () => ({
                message: 'Bgalin Server (Bun) - public endpoint',
            }))
            .get('/health', () => ({
                status: 'ok',
                timestamp: new Date().toISOString(),
            }))
            .get('/server_time', () => ({
                server_time: new Date().toISOString(),
            }))
    );
