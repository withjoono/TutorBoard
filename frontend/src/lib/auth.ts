const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:3000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4005';

export function redirectToLogin() {
    const currentUrl = window.location.href;
    window.location.href = `${HUB_URL}/auth/login?redirect=${encodeURIComponent(currentUrl)}`;
}

export function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.reload();
}

export function isLoggedIn(): boolean {
    return !!localStorage.getItem('accessToken');
}

export async function processSSOLogin(): Promise<boolean> {
    const params = new URLSearchParams(window.location.search);
    const ssoCode = params.get('sso_code');

    if (!ssoCode) return false;

    try {
        const response = await fetch(`${API_URL}/auth/sso/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: ssoCode }),
        });

        if (!response.ok) return false;

        const result = await response.json();
        if (result.success || result.accessToken) {
            localStorage.setItem('accessToken', result.accessToken);
            if (result.refreshToken) {
                localStorage.setItem('refreshToken', result.refreshToken);
            }

            // Clean up URL
            const url = new URL(window.location.href);
            url.searchParams.delete('sso_code');
            window.history.replaceState({}, '', url.toString());
            return true;
        }
    } catch (e) {
        console.warn('[SSO] Exchange failed:', e);
    }

    return false;
}
