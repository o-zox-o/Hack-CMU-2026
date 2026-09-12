<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		/** Absolute or app-relative; resolved against the current origin. */
		path: string;
		title: string;
		/** Private activities are invite-by-link, so the button leads there. */
		emphasis?: boolean;
	}

	let { path, title, emphasis = false }: Props = $props();

	let state = $state<'idle' | 'copied' | 'failed'>('idle');
	let timer: ReturnType<typeof setTimeout> | null = null;

	function flash(next: 'copied' | 'failed') {
		state = next;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => (state = 'idle'), 2200);
	}

	async function share() {
		const url = new URL(path, location.origin).href;

		/* The native sheet where there is one: on a phone that's the difference
		   between "copied, now go find a chat" and actually sending it. */
		if (navigator.share) {
			try {
				await navigator.share({ title, url });
				return;
			} catch {
				// Dismissing the sheet lands here too, so fall through to copying
				// rather than showing an error for something that isn't one.
			}
		}

		try {
			await navigator.clipboard.writeText(url);
			flash('copied');
		} catch {
			// clipboard needs a secure context, which rules out plain http on a
			// LAN address. Select the URL so it can still be copied by hand.
			flash('failed');
			prompt('Copy this link:', url);
		}
	}
</script>

<button
	type="button"
	class="btn {emphasis ? 'btn-primary' : 'btn-ghost'} shrink-0 px-3 py-1"
	onclick={share}
	aria-live="polite"
>
	{#if state === 'copied'}
		<Icon name="check" size={13} strokeWidth={3} /> Link copied
	{:else if state === 'failed'}
		<Icon name="close" size={13} strokeWidth={3} /> Copy it above
	{:else}
		<Icon name="share" size={13} /> Share
	{/if}
</button>
