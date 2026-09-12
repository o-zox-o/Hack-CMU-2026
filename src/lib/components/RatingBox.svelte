<script lang="ts">
	import { enhance } from '$app/forms';
	import { MIN_RATINGS_TO_SHOW, type ActivityView } from '$lib/types';
	import Icon from './Icon.svelte';

	interface Props {
		activity: ActivityView;
	}

	let { activity }: Props = $props();

	let rating = $derived(activity.rating);
	let hovered = $state(0);
	let busy = $state(false);

	const SCORES = [1, 2, 3, 4, 5];
</script>

{#if rating.canRate || rating.rated || rating.average !== null}
	<section class="mt-4 rounded-lg bg-surface-sunk p-3">
		<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
			How was it?
		</h2>

		{#if rating.average !== null}
			<p class="mt-1 flex items-baseline gap-1.5">
				<span class="text-fluid-lg font-extrabold text-ink">{rating.average}</span>
				<span class="text-fluid-xs text-ink-muted">
					out of 5 · {rating.count}
					{rating.count === 1 ? 'rating' : 'ratings'}
				</span>
			</p>
		{:else if rating.count > 0}
			<p class="mt-1 text-fluid-xs text-ink-muted">
				{rating.count} of {MIN_RATINGS_TO_SHOW} ratings in. The average shows once one more lands, so
				no single score can be traced back.
			</p>
		{/if}

		{#if rating.canRate}
			<form
				method="POST"
				action="?/rate"
				class="mt-2 flex flex-wrap items-center gap-2"
				use:enhance={() => {
					busy = true;
					return async ({ update }) => {
						busy = false;
						await update();
					};
				}}
			>
				<!-- Each star is a submit button, so the group needs no role of its own;
				     it only groups them for screen readers and resets the hover. -->
				<div
					class="flex items-center gap-0.5"
					role="group"
					aria-label="Rate this activity out of 5"
					onmouseleave={() => (hovered = 0)}
				>
					{#each SCORES as score (score)}
						<button
							type="submit"
							name="score"
							value={score}
							class="rounded p-1 transition-colors {hovered >= score
								? 'text-brand-ink'
								: 'text-ink-muted'} hover:text-brand-ink"
							disabled={busy}
							title="{score} out of 5"
							aria-label="{score} out of 5"
							onmouseenter={() => (hovered = score)}
							onfocus={() => (hovered = score)}
						>
							<Icon name="star" size={20} />
						</button>
					{/each}
				</div>
				<span class="text-fluid-xs text-ink-muted"
					>Anonymous. The host never sees who said what.</span
				>
			</form>
		{:else if rating.rated}
			<p class="mt-1.5 inline-flex items-center gap-1 text-fluid-xs font-bold text-brand-ink">
				<Icon name="check" size={13} strokeWidth={3} /> Thanks, your rating is in, anonymously.
			</p>
		{/if}
	</section>
{/if}
