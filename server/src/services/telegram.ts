export class TelegramService {
    private botToken: string;

    constructor(botToken: string) {
        this.botToken = botToken;
    }

    async sendMessage(chatId: number, text: string): Promise<void> {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Telegram API error: ${errorText}`);
        }
    }

    async sendOtpCode(chatId: number, code: string): Promise<void> {
        const message = `🔐 <b>Код для входа:</b>\n\n<code>${code}</code>\n\nКод действителен 5 минут.`;
        await this.sendMessage(chatId, message);
    }
}
