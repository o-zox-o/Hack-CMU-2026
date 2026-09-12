import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

const KEY = 'tagalong:theme';

/** What a viewer gets before they have expressed any preference. */
const DEFAULT: Theme = 'light';

function isTheme(value: unknown): value is Theme {
	return value === 'light' || value === 'dark' || value === 'system';
}

function read(): Theme {
	if (!browser) return DEFAULT;
	try {
		const saved = localStorage.getItem(KEY);
		return isTheme(saved) ? saved : DEFAULT;
	} catch {
		return DEFAULT; // private mode, blocked storage
	}
}

/**
 * The viewer's theme choice. `system` follows the OS; light/dark stamp
 * `data-theme` on <html>, which the token overrides in layout.css key off.
 * The same value is applied before first paint by the inline script in
 * app.html, so there is no flash on load.
 *
 * The default is light rather than system, so `system` has to be stored
 * explicitly: removing the key on that choice would read back as the default
 * on the next load, quietly turning "follow my OS" into "light".
 */
class ThemeStore {
	current = $state<Theme>(read());

	set(next: Theme) {
		this.current = next;
		if (!browser) return;

		if (next === 'system') delete document.documentElement.dataset.theme;
		else document.documentElement.dataset.theme = next;

		try {
			localStorage.setItem(KEY, next);
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
