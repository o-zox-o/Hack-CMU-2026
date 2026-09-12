/**
 * Gate that decides whether an email address is an eligible college address.
 *
 * Swap `isKnownCollegeDomain` for a real lookup (e.g. the Hipo/Hippo university
 * domain list, https://github.com/Hipo/university-domains-list) once you've
 * picked a source. Falls back to a plain ".edu" suffix check so signup works
 * before that data is wired in.
 */

let domainSet: Set<string> | null = null;

export function loadCollegeDomains(domains: string[]) {
	domainSet = new Set(domains.map((d) => d.toLowerCase()));
}

export function extractDomain(email: string): string | null {
	const at = email.lastIndexOf('@');
	if (at === -1) return null;
	return email.slice(at + 1).toLowerCase();
}

export function isEligibleCollegeEmail(email: string): boolean {
	const domain = extractDomain(email);
	if (!domain) return false;

	if (domainSet) {
		return domainSet.has(domain);
	}

	// Fallback until the full domain list is loaded.
	return domain.endsWith('.edu');
}
