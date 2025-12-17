import { prisma } from '../db';
import { randomBytes, createHash } from 'crypto';

export class AuthService {
    /**
     * Generate a 6-digit OTP code
     */
    static generateOtp(): string {
        const min = 0;
        const max = 999999;
        const otp = Math.floor(Math.random() * (max - min + 1)) + min;
        return otp.toString().padStart(6, '0');
    }

    /**
     * Generate a secure session token (SHA256 of UUID + Timestamp)
     */
    static generateToken(): string {
        const uuid = crypto.randomUUID();
        const timestamp = Math.floor(Date.now() / 1000).toString();
        
        const hash = createHash('sha256');
        hash.update(uuid);
        hash.update(timestamp);
        
        return hash.digest('hex');
    }

    /**
     * Get or create user by telegram_id
     */
    static async getOrCreateUser(telegramId: number) {
        // BigInt handling for telegram_id
        const telegramIdBigInt = BigInt(telegramId);

        let user = await prisma.user.findUnique({
            where: { telegram_id: telegramIdBigInt },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    telegram_id: telegramIdBigInt,
                },
            });
        }

        return user;
    }

    /**
     * Create OTP code for user
     */
    static async createOtp(userId: number) {
        // Invalidate all previous unused codes
        await prisma.otpCode.updateMany({
            where: {
                user_id: userId,
                used: false,
            },
            data: {
                used: true,
            },
        });

        const code = this.generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        const otp = await prisma.otpCode.create({
            data: {
                user_id: userId,
                code: code,
                expires_at: expiresAt,
            },
        });

        return otp;
    }

    /**
     * Verify OTP and create session
     */
    static async verifyOtp(telegramId: number, code: string): Promise<string | null> {
        const telegramIdBigInt = BigInt(telegramId);
        
        const user = await prisma.user.findUnique({
            where: { telegram_id: telegramIdBigInt },
        });

        if (!user) {
            return null;
        }

        // Find valid OTP
        const otp = await prisma.otpCode.findFirst({
            where: {
                user_id: user.id,
                code: code,
                used: false,
                expires_at: {
                    gt: new Date(),
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        if (!otp) {
            return null;
        }

        // Mark OTP as used
        await prisma.otpCode.update({
            where: { id: otp.id },
            data: { used: true },
        });

        // Create session (expires in 30 days)
        const token = this.generateToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await prisma.session.create({
            data: {
                user_id: user.id,
                token: token,
                expires_at: expiresAt,
            },
        });

        return token;
    }

    /**
     * Validate session token
     */
    static async validateToken(token: string) {
        const session = await prisma.session.findFirst({
            where: {
                token: token,
                expires_at: {
                    gt: new Date(),
                },
            },
            include: {
                user: true,
            },
        });

        if (!session) {
            return null;
        }

        return session.user;
    }
}
