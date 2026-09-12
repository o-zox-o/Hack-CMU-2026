/**
 * Not part of the app's codebase — paste this into the Auth0 Dashboard as a
 * "Pre User Registration" Action (Actions > Library > Build Custom > trigger:
 * pre-user-registration) and add it to that flow.
 *
 * Our app's /auth/callback route already rejects non-.edu emails, but that
 * only runs after Auth0 has created the account. This Action blocks
 * ineligible signups at the source, so someone can't create an account by
 * hitting Auth0's endpoints directly and skipping our app.
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
