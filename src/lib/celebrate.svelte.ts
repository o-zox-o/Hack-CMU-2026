/**
 * The little party that fires when you join something, or earn a badge.
 *
 * A module-level store so any component can set it off: the button that
 * triggers it may be inside a card that re-renders straight afterwards, so the
 * overlay lives in the app layout instead and just watches this.
 *
 * Messages queue rather than replace. Joining an activity can finish a badge,
 * and two things worth celebrating shouldn't cancel each other out.
 */

const DURATION = 3200;

class Celebration {
	message = $state<string | null>(null);
	private queue: string[] = [];
	private timer: ReturnType<typeof setTimeout> | null = null;

	/** Queue one or more. They play in order, each for DURATION. */
	start(...messages: string[]) {
		this.queue.push(...messages.filter(Boolean));
		if (this.message === null) this.advance();
	}

	dismiss() {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		this.queue = [];
		this.message = null;
	}

	private advance() {
		if (this.timer) clearTimeout(this.timer);

		const next = this.queue.shift();
		this.message = next ?? null;
		this.timer = next === undefined ? null : setTimeout(() => this.advance(), DURATION);
	}
}

export const celebration = new Celebration();
