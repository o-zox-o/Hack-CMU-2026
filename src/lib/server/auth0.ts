/**
 * Auth0 Passwordless Email — used only to prove a signup's email address is
 * real and reachable before we create the account. Auth0 never sees or
 * stores the account's password; that stays entirely in our own DB (auth.ts
 * + db.ts), unchanged.
 *
 * Requires the tenant's Passwordless "Email" connection enabled for this
 * Application (Auth0 Dashboard > Authentication > Passwordless > Email,
 * then enable it under this app's Connections tab).
 */
import { env } from '$env/dynamic/private';

function requireEnv(name: string): string {
	const value = env[name];
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

/** Emails a one-time code to the given address. */
export async function startPasswordlessEmail(email: string): Promise<void> {
	const domain = requireEnv('AUTH0_DOMAIN');
	const res = await fetch(`https://${domain}/passwordless/start`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: requireEnv('AUTH0_CLIENT_ID'),
			client_secret: requireEnv('AUTH0_CLIENT_SECRET'),
			connection: 'email',
			email,
			send: 'code'
		})
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Auth0 passwordless start failed (${res.status}): ${body}`);
	}
}

/** Returns true if `code` is the one Auth0 emailed to `email`. */
export async function verifyPasswordlessCode(email: string, code: string): Promise<boolean> {
	const domain = requireEnv('AUTH0_DOMAIN');
	const res = await fetch(`https://${domain}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			grant_type: 'http://auth0.com/oauth/grant-type/passwordless/otp',
			client_id: requireEnv('AUTH0_CLIENT_ID'),
			client_secret: requireEnv('AUTH0_CLIENT_SECRET'),
			username: email,
			otp: code,
			realm: 'email',
			scope: 'openid'
		})
	});

	if (!res.ok) {
		console.error(`Auth0 passwordless verify failed (${res.status}):`, await res.text());
	}

	return res.ok;
}
