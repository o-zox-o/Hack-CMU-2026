import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

const KEY = 'tagalong:theme';

function read(): Theme {
	if (!browser) return 'system';
	try {
		const saved = localStorage.getItem(KEY);
		return saved === 'light' || saved === 'dark' ? saved : 'system';
	} catch {
		return 'system'; // private mode, blocked storage
	}
}

/**
 * The viewer's theme choice. `system` follows the OS; light/dark stamp
 * `data-theme` on <html>, which the token overrides in layout.css key off.
 * The same value is applied before first paint by the inline script in
 * app.html, so there is no flash on load.
 */
class ThemeStore {
	current = $state<Theme>(read());

	set(next: Theme) {
		this.current = next;
		if (!browser) return;

		if (next === 'system') delete document.documentElement.dataset.theme;
		else document.documentElement.dataset.theme = next;

		try {
			if (next === 'system') localStorage.removeItem(KEY);
			else localStorage.setItem(KEY, next);
		} catch {
			/* nothing we can do; the choice still applies for this page */
		}
	}

	/** Light → Dark → System → Light. */
	cycle() {
		this.set(this.current === 'light' ? 'dark' : this.current === 'dark' ? 'system' : 'light');
	}
}

export const theme = new ThemeStore();
