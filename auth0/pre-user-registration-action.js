/**
 * Not part of the app's codebase — paste this into the Auth0 Dashboard as a
 * "Pre User Registration" Action (Actions > Library > Build Custom > trigger:
 * pre-user-registration) and add it to that flow.
 *
 * Our own signup action (src/routes/login/+page.server.ts) already checks
 * the domain before it ever calls Auth0's Passwordless API, so this Action
 * is defense-in-depth at Auth0's own connection level, not the primary
 * gate — it stops someone from creating an ineligible account by hitting
 * Auth0's endpoints directly and skipping our app entirely.
 *
 * Deliberately just a ".edu" suffix check rather than a curated domain
 * list: .edu is a restricted TLD — Educause requires proof of accreditation
 * to register one — so the suffix alone is already a meaningful signal.
 */
exports.onExecutePreUserRegistration = async (event, api) => {
	const email = event.user.email || '';
	const domain = email.split('@')[1]?.toLowerCase();

	if (!domain || !domain.endsWith('.edu')) {
		api.access.deny('ineligible_domain', 'Sign up with your college email address.');
	}
};
