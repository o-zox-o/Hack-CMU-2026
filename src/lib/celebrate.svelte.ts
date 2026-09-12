/**
 * The little party that fires when you join something.
 *
 * A module-level store so any component can set it off — the button that
 * triggers it may be inside a card that re-renders straight afterwards, so the
 * overlay lives in the app layout instead and just watches this.
 */

const DURATION = 3200;

class Celebration {
	message = $state<string | null>(null);
	private timer: ReturnType<typeof setTimeout> | null = null;

	start(message: string) {
		this.message = message;
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => (this.message = null), DURATION);
	}

	dismiss() {
		if (this.timer) clearTimeout(this.timer);
		this.message = null;
	}
}

export const celebration = new Celebration();
