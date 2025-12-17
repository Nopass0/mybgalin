import { Elysia, t } from 'elysia';
import { AuthService } from '../services/auth';
import { TelegramService } from '../services/telegram';

export const authController = (app: Elysia) =>
    app.group('/api/auth', (app) =>
        app
            .post(
                '/request-otp',
                async ({ body, set }) => {
                    try {
                        const adminId = parseInt(process.env.ADMIN_TELEGRAM_ID || '0');
                        if (!adminId) {
                            throw new Error('ADMIN_TELEGRAM_ID not set');
                        }

                        // Get or create user
                        const user = await AuthService.getOrCreateUser(adminId);

                        // Generate and save OTP
                        const otp = await AuthService.createOtp(user.id);

                        // Send via Telegram
                        const telegramBot = new TelegramService(process.env.TELEGRAM_BOT_TOKEN || '');
                        await telegramBot.sendOtpCode(adminId, otp.code);

                        return {
                            success: true,
                            message: 'OTP code sent to Telegram',
                        };
                    } catch (error: any) {
                        set.status = 500;
                        return {
                            success: false,
                            error: `Failed to request OTP: ${error.message}`,
                        };
                    }
                },
                {
                    body: t.Object({}),
                    detail: {
                        summary: 'Request OTP code',
                        tags: ['Auth'],
                    },
                }
            )
            .post(
                '/verify-otp',
                async ({ body, set }) => {
                    try {
                        const adminId = parseInt(process.env.ADMIN_TELEGRAM_ID || '0');
                        const token = await AuthService.verifyOtp(adminId, body.code);

                        if (token) {
                            return {
                                success: true,
                                token: token,
                                message: 'Authentication successful',
                            };
                        } else {
                            // 200 OK but success=false for invalid OTP, matching Rust behavior if desired,
                            // or we can use 400/401. Rust implementation returned 200 with success: false.
                            return {
                                success: false,
                                token: null,
                                message: 'Invalid or expired OTP code',
                            };
                        }
                    } catch (error: any) {
                        set.status = 500;
                        return {
                            success: false,
                            error: `Database error: ${error.message}`,
                        };
                    }
                },
                {
                    body: t.Object({
                        code: t.String(),
                    }),
                    detail: {
                        summary: 'Verify OTP code',
                        tags: ['Auth'],
                    },
                }
            )
    );
