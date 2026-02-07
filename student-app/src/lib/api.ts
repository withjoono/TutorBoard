const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4005';

export async function apiRequest<T>(
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
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
        });

        if (response.status === 401) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            return null;
        }

        if (!response.ok) return null;

        const json = await response.json();
        return json && typeof json === 'object' && 'data' in json ? json.data : json;
    } catch (e) {
        console.warn('[api] Request error:', e);
        return null;
    }
}

export const api = {
    get: <T>(endpoint: string) => apiRequest<T>(endpoint),
    post: <T>(endpoint: string, body?: any) =>
        apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(endpoint: string, body?: any) =>
        apiRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
};
