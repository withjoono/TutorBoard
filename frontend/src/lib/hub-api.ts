// Hub Backend API (localhost:4000)
const HUB_API_URL = import.meta.env.VITE_HUB_API_URL || 'http://localhost:4000';

export async function hubApiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T | null> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${HUB_API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) return null;

        const json = await response.json();
        // Hub Backend wraps responses in { success, data }
        return json && typeof json === 'object' && 'data' in json ? json.data : json;
    } catch (e) {
        console.warn('[hub-api] Request error:', e);
        return null;
    }
}

export const hubApi = {
    get: <T>(endpoint: string) => hubApiRequest<T>(endpoint),
    post: <T>(endpoint: string, body?: any) =>
        hubApiRequest<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    delete: <T>(endpoint: string) =>
        hubApiRequest<T>(endpoint, { method: 'DELETE' }),
};
