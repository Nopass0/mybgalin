export class HhService {
    private accessToken: string | null = null;
    private readonly baseUrl = 'https://api.hh.ru';
    private readonly userAgent = 'bgalin.ru (contact@bgalin.ru)';

    constructor() {}

    setToken(token: string) {
        this.accessToken = token;
    }

    private get headers() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'HH-User-Agent': this.userAgent,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Search vacancies with detailed filters
     */
    async searchVacancies(
        text: string,
        area?: string,
        salary?: number,
        experience?: string,
        schedule?: string,
        employment?: string,
        onlyWithSalary: boolean = false
    ) {
        if (!this.accessToken) throw new Error('Not authorized');

        const params = new URLSearchParams({
            text,
            per_page: '100',
            order_by: 'publication_time',
        });

        if (area) params.append('area', area);
        if (salary) params.append('salary', salary.toString());
        if (experience) params.append('experience', experience);
        if (schedule) params.append('schedule', schedule);
        if (employment) params.append('employment', employment);
        if (onlyWithSalary) params.append('only_with_salary', 'true');

        const response = await fetch(`${this.baseUrl}/vacancies?${params.toString()}`, {
            headers: this.headers,
        });

        if (!response.ok) {
            throw new Error(`HH API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.items || [];
    }

    /**
     * Apply to a vacancy
     */
    async applyToVacancy(vacancyId: string, coverLetter: string, resumeId: string): Promise<string> {
        if (!this.accessToken) throw new Error('Not authorized');

        const response = await fetch(`${this.baseUrl}/negotiations`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                vacancy_id: vacancyId,
                resume_id: resumeId,
                message: coverLetter,
            }),
        });

        // 201 Created or 303 See Other usually indicate success/redirect
        if (response.status === 201 || response.status === 303) {
            const location = response.headers.get('Location');
            if (location) {
                const parts = location.split('/');
                const id = parts[parts.length - 1];
                if (id) return id;
            }
            return `neg_${vacancyId}`; // Fallback ID
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Apply error: ${response.status} - ${errorText}`);
        }

        // Try to parse body for ID if standard success
        try {
            const data = await response.json();
            if (data.id) return data.id;
        } catch (e) {
            // Body might be empty
        }

        return `neg_${vacancyId}`;
    }

    /**
     * Get active negotiations (responses)
     */
    async getNegotiations() {
        if (!this.accessToken) throw new Error('Not authorized');

        const response = await fetch(`${this.baseUrl}/negotiations`, {
            headers: this.headers,
        });

        if (!response.ok) {
            throw new Error(`HH API error: ${response.status}`);
        }

        const data = await response.json();
        return data.items || [];
    }

    /**
     * Get user's resumes
     */
    async getResumes() {
        if (!this.accessToken) throw new Error('Not authorized');

        const response = await fetch(`${this.baseUrl}/resumes/mine`, {
            headers: this.headers,
        });

        if (!response.ok) {
            throw new Error(`HH API error: ${response.status}`);
        }

        const data = await response.json();
        return data.items || [];
    }

    /**
     * Get messages in a negotiation
     */
    async getMessages(negotiationId: string) {
        if (!this.accessToken) throw new Error('Not authorized');

        const response = await fetch(`${this.baseUrl}/negotiations/${negotiationId}/messages`, {
            headers: this.headers,
        });

        if (!response.ok) {
            throw new Error(`HH API error: ${response.status}`);
        }

        const data = await response.json();
        return data.items || [];
    }

    /**
     * Send message in a negotiation
     */
    async sendMessage(negotiationId: string, message: string) {
        if (!this.accessToken) throw new Error('Not authorized');

        const response = await fetch(`${this.baseUrl}/negotiations/${negotiationId}/messages`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            throw new Error(`Send message error: ${response.status}`);
        }
    }

    /**
     * Get vacancy details
     */
    async getVacancy(vacancyId: string) {
        if (!this.accessToken) throw new Error('Not authorized');

        const response = await fetch(`${this.baseUrl}/vacancies/${vacancyId}`, {
            headers: this.headers,
        });

        if (!response.ok) {
            throw new Error(`HH API error: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Refresh OAuth token
     */
    static async refreshToken(clientId: string, clientSecret: string, refreshToken: string) {
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
        });

        const response = await fetch('https://hh.ru/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        if (!response.ok) {
            throw new Error(`Refresh token error: ${response.status}`);
        }

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
        };
    }
}
