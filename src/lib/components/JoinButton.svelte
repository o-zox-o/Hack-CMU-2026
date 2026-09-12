<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
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
	const refresh: SubmitFunction = () => {
		busy = true;
		return async ({ result }) => {
			busy = false;
			if (result.type === 'success' || result.type === 'redirect') await invalidateAll();
			else await applyAction(result);
		};
	};

	let width = $derived(block ? 'w-full' : '');
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
			<Icon name="clock" size={14} /> Waiting for host
		</button>
	</form>
{:else if activity.isFull}
	<form method="POST" action="/activities/{activity.id}?/requestSpot" use:enhance={refresh}>
		<button type="submit" class="btn btn-ghost {width}" disabled={busy}>
			<Icon name="clock" size={14} /> Ask to join
		</button>
	</form>
{:else}
	<form method="POST" action="/activities/{activity.id}?/join" use:enhance={refresh}>
		<button type="submit" class="btn btn-primary {width}" disabled={busy}>
			<Icon name="plus" size={14} strokeWidth={3} /> Join
		</button>
	</form>
{/if}
