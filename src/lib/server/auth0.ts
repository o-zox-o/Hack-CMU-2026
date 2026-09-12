import { env } from '$env/dynamic/private';

function requireEnv(name: string): string {
	const value = env[name];
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

interface TokenResponse {
	access_token: string;
	id_token: string;
}

export interface Auth0Profile {
	sub: string;
	email: string;
	email_verified: boolean;
	name?: string;
	picture?: string;
}

/**
 * Builds the Auth0 Universal Login URL. `screen_hint=signup` opens straight
 * on the signup tab; Auth0 still shows login too, so this same endpoint
 * covers both.
 */
export function getAuthorizeUrl(state: string): string {
	const domain = requireEnv('AUTH0_DOMAIN');
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: requireEnv('AUTH0_CLIENT_ID'),
		redirect_uri: requireEnv('AUTH0_CALLBACK_URL'),
		scope: 'openid profile email',
		state,
		screen_hint: 'signup'
	});
	return `https://${domain}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
	const domain = requireEnv('AUTH0_DOMAIN');
	const res = await fetch(`https://${domain}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			grant_type: 'authorization_code',
			client_id: requireEnv('AUTH0_CLIENT_ID'),
			client_secret: requireEnv('AUTH0_CLIENT_SECRET'),
			code,
			redirect_uri: requireEnv('AUTH0_CALLBACK_URL')
		})
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Auth0 token exchange failed (${res.status}): ${body}`);
	}

	return res.json();
}

export async function getAuth0UserInfo(accessToken: string): Promise<Auth0Profile> {
	const domain = requireEnv('AUTH0_DOMAIN');
	const res = await fetch(`https://${domain}/userinfo`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Auth0 userinfo failed (${res.status}): ${body}`);
	}

	return res.json();
}

export function getLogoutUrl(): string {
	const domain = requireEnv('AUTH0_DOMAIN');
	const params = new URLSearchParams({
		client_id: requireEnv('AUTH0_CLIENT_ID'),
		returnTo: env.AUTH0_LOGOUT_REDIRECT_URL || '/'
	});
	return `https://${domain}/v2/logout?${params.toString()}`;
}
