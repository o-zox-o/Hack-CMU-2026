<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { celebration } from '$lib/celebrate.svelte';
	import type { ActivityView } from '$lib/types';
	import Icon from './Icon.svelte';

	interface Props {
		activity: ActivityView;
		/** Stretch to the container — used on the detail page. */
		block?: boolean;
	}

	let { activity, block = false }: Props = $props();

	let busy = $state(false);

	/* The join/leave actions live on the detail route. Posting to them from the
	   feed works without JS (it just lands you on the detail page), and with JS
	   we refresh the current page's data instead of navigating. */
	function submit(onSuccess?: () => void): SubmitFunction {
		return () => {
			busy = true;
			return async ({ result }) => {
				busy = false;
				if (result.type === 'success' || result.type === 'redirect') {
					onSuccess?.();
					await invalidateAll();
				} else {
					await applyAction(result);
				}
			};
		};
	}

	const refresh = submit();
	const joinAndCelebrate = submit(() =>
		celebration.start("Congrats, you're planning to touch grass!")
	);

	let width = $derived(block ? 'w-full' : '');

	/* Two ways a join becomes a request: the host vets everyone, or it's full.
	   The wording differs — one is "ask", the other is "queue". */
	let vetted = $derived(activity.approvalRequired);
</script>

{#if activity.isHost}
	<span
		class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-fluid-xs font-bold text-ink-muted {width}"
	>
		<Icon name="leaf" size={14} /> You're hosting
	</span>
{:else if activity.joined}
	<form method="POST" action="/activities/{activity.id}?/leave" use:enhance={refresh}>
		<button type="submit" class="btn btn-ghost {width}" disabled={busy} title="Leave this activity">
			<Icon name="check" size={14} strokeWidth={3} /> Joined
		</button>
	</form>
{:else if activity.onWaitlist}
	<form method="POST" action="/activities/{activity.id}?/cancelRequest" use:enhance={refresh}>
		<button
			type="submit"
			class="btn btn-ghost {width}"
			disabled={busy}
			title="Withdraw your request"
		>
			<Icon name="clock" size={14} />
			{vetted ? 'Asked to join' : 'Waitlisted'}
		</button>
	</form>
{:else if vetted || activity.isFull}
	<form method="POST" action="/activities/{activity.id}?/requestSpot" use:enhance={refresh}>
		<button
			type="submit"
			class="btn {vetted ? 'btn-primary' : 'btn-ghost'} {width}"
			disabled={busy}
			title={vetted
				? 'The host approves everyone who joins'
				: 'The host will let you know if a spot opens up'}
		>
			<Icon name={vetted ? 'lock' : 'clock'} size={14} />
			{vetted ? 'Request to join' : 'Add to waitlist'}
		</button>
	</form>
{:else}
	<form method="POST" action="/activities/{activity.id}?/join" use:enhance={joinAndCelebrate}>
		<button type="submit" class="btn btn-primary {width}" disabled={busy}>
			<Icon name="plus" size={14} strokeWidth={3} /> Join
		</button>
	</form>
{/if}
