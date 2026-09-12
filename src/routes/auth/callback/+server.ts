import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { exchangeCodeForTokens, getAuth0UserInfo } from '$lib/server/auth0.js';
import { isEligibleCollegeEmail } from '$lib/server/collegeEmail.js';
import { findOrCreateUser } from '$lib/server/users.js';
import { createSessionToken, SESSION_COOKIE } from '$lib/server/session.js';

const STATE_COOKIE = 'auth_state';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const authError = url.searchParams.get('error');
	if (authError) {
		const description = url.searchParams.get('error_description') ?? authError;
		error(400, `Sign-in failed: ${description}`);
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expectedState = cookies.get(STATE_COOKIE);
	cookies.delete(STATE_COOKIE, { path: '/' });

	if (!code || !state || !expectedState || state !== expectedState) {
		error(400, 'Invalid or expired login request. Please try signing in again.');
	}

	const { access_token } = await exchangeCodeForTokens(code);
	const profile = await getAuth0UserInfo(access_token);

	// Gate 1: Auth0 must have confirmed the address is real.
	if (!profile.email_verified) {
		redirect(302, `/verify-email?email=${encodeURIComponent(profile.email)}`);
	}

	// Gate 2: address must belong to an eligible college.
	if (!isEligibleCollegeEmail(profile.email)) {
		redirect(302, '/not-eligible');
	}

	const user = await findOrCreateUser({
		auth0Id: profile.sub,
		email: profile.email,
		name: profile.name,
		picture: profile.picture
	});

	const sessionToken = await createSessionToken({ userId: user._id.toString() });
	cookies.set(SESSION_COOKIE, sessionToken, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7
	});

	redirect(302, user.profileComplete ? '/dashboard' : '/onboarding/profile');
};
