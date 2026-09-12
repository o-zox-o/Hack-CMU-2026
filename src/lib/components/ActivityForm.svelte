<script lang="ts" module>
	import type { ActivityView, Visibility } from '$lib/types';
	import type { IconName } from '$lib/components/Icon.svelte';
	import { centsToInput, toLocalInputValue } from '$lib/format';

	/**
	 * Every field as the form holds it — strings, because that's what inputs
	 * give back. The two pages that use this form fill it from different
	 * places, so they build one of these first.
	 */
	export interface ActivityFormValues {
		title: string;
		body: string;
		category: string;
		campus: string;
		location: string;
		startsAt: string;
		spots: string;
		cost: string;
		costBasis: string;
		visibility: string;
		approvalRequired: boolean;
	}

	/** The four tiers, widest first. Two of them need a verified .edu address. */
	export const OPTIONS = [
		{
			id: 'public',
			label: 'Everyone',
			icon: 'compass',
			blurb: 'Anyone on Tagalong, including people without a .edu address.',
			studentOnly: false
		},
		{
			id: 'students',
			label: 'Students only',
			icon: 'sprout',
			blurb: 'Anyone with a verified .edu address, whatever their school.',
			studentOnly: true
		},
		{
			id: 'campus',
			label: 'My campus',
			icon: 'pin',
			blurb: 'Only students at your own school.',
			studentOnly: true
		},
		{
			id: 'private',
			label: 'Private',
			icon: 'lock',
			blurb: 'Kept out of every feed. Only people you send the link to can open it.',
			studentOnly: false
		}
	] as const satisfies readonly {
		id: Visibility;
		label: string;
		icon: IconName;
		blurb: string;
		studentOnly: boolean;
	}[];

	/** A blank form: tomorrow at noon, room for four, split per person. */
	export function blankActivity(campus: string): ActivityFormValues {
		const tomorrowNoon = new Date();
		tomorrowNoon.setDate(tomorrowNoon.getDate() + 1);
		tomorrowNoon.setHours(12, 0, 0, 0);

		return {
			title: '',
			body: '',
			category: 'groceries',
			campus,
			location: '',
			startsAt: toLocalInputValue(tomorrowNoon),
			spots: '4',
			cost: '',
			costBasis: 'per-person',
			visibility: 'public',
			approvalRequired: false
		};
	}

	/** An existing activity, back in editable form. */
	export function activityToForm(activity: ActivityView): ActivityFormValues {
		return {
			title: activity.title,
			body: activity.body,
			category: activity.category,
			campus: activity.campus,
			location: activity.location,
			startsAt: toLocalInputValue(new Date(activity.startsAt)),
			spots: String(activity.spots),
			cost: centsToInput(activity.costCents),
			costBasis: activity.costBasis,
			visibility: activity.visibility,
			approvalRequired: activity.approvalRequired
		};
	}
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import { costSplit, parseCents } from '$lib/format';
	import { CAMPUSES, CATEGORIES, START_GRACE_MINUTES } from '$lib/types';
	import { MAX_SPOTS, type FieldErrors } from '$lib/validate';

	interface Props {
		/** Where the fields start. Seeded once — the bound state takes over after. */
		values: ActivityFormValues;
		errors?: FieldErrors;
		submitLabel: string;
		busyLabel: string;
		cancelHref: string;
		/**
		 * The people already in, on an edit. You can't shrink an activity out
		 * from under them, so the number input stops here.
		 */
		minSpots?: number;
		/** Only a verified .edu account can post to the edu hub. */
		student?: boolean;
		/** Named on the "just my campus" option, so the choice is concrete. */
		campusLabel?: string;
	}

	let {
		values,
		errors = {},
		submitLabel,
		busyLabel,
		cancelHref,
		minSpots = 2,
		student = true,
		campusLabel = 'my campus'
	}: Props = $props();

	/* Seeded once on purpose: after the first render these own themselves, so a
	   failed submit doesn't blank what was typed. */
	// svelte-ignore state_referenced_locally
	let title = $state(values.title);
	// svelte-ignore state_referenced_locally
	let body = $state(values.body);
	// svelte-ignore state_referenced_locally
	let category = $state(values.category);
	// svelte-ignore state_referenced_locally
	let campus = $state(values.campus);
	// svelte-ignore state_referenced_locally
	let location = $state(values.location);
	// svelte-ignore state_referenced_locally
	let startsAt = $state(values.startsAt);
	// svelte-ignore state_referenced_locally
	let spots = $state(values.spots);
	// svelte-ignore state_referenced_locally
	let cost = $state(values.cost);
	// svelte-ignore state_referenced_locally
	let costBasis = $state(values.costBasis);
	// svelte-ignore state_referenced_locally
	let visibility = $state(values.visibility);
	// svelte-ignore state_referenced_locally
	let approvalRequired = $state(values.approvalRequired);

	let submitting = $state(false);

	/* Live maths so the host sees both halves before posting: always the number
	   they did NOT type. Same helper the activity page uses, so the figure
	   doesn't change wording between writing the post and reading it. */
	let preview = $derived.by(() => {
		const cents = parseCents(cost);
		const headcount = Number(spots);
		if (cents === null || !Number.isInteger(headcount)) return null;
		return costSplit(cents, costBasis === 'total' ? 'total' : 'per-person', headcount);
	});

	/* Resolved in the browser, which is the only place that knows the viewer's
	   offset for that date. Empty while the field is mid-edit, which just means
	   the server falls back to the naive value. */
	let startsAtUtc = $derived.by(() => {
		const d = new Date(startsAt);
		return Number.isNaN(d.getTime()) ? '' : d.toISOString();
	});

	/* Editing something that already started shouldn't fight you over its own
	   date, so the floor only applies while the start time is still ahead. */
	let minStart = $derived(
		new Date(values.startsAt).getTime() < Date.now()
			? undefined
			: toLocalInputValue(new Date(Date.now() - START_GRACE_MINUTES * 60_000))
	);

	const err = 'mt-1 text-fluid-xs font-bold text-berry-500';
</script>

<form
	method="POST"
	class="leaf-card flex flex-col gap-5 p-4 sm:p-6"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update({ reset: false });
		};
	}}
>
	{#if errors.form}
		<p class="rounded-lg bg-berry-500/10 px-3 py-2 text-fluid-sm font-bold text-berry-500">
			{errors.form}
		</p>
	{/if}

	<div>
		<label class="label" for="title">Title</label>
		<input
			id="title"
			name="title"
			class="field"
			bind:value={title}
			placeholder="Costco run Saturday. I drive, split gas"
			maxlength="120"
			required
		/>
		{#if errors.title}<p class={err}>{errors.title}</p>{/if}
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div>
			<label class="label" for="category">Category</label>
			<select id="category" name="category" class="field" bind:value={category}>
				{#each CATEGORIES as c (c.id)}
					<option value={c.id}>{c.label}</option>
				{/each}
			</select>
			{#if errors.category}<p class={err}>{errors.category}</p>{/if}
		</div>
		<div>
			<label class="label" for="campus">Campus</label>
			<select id="campus" name="campus" class="field" bind:value={campus}>
				{#each CAMPUSES as c (c.id)}
					<option value={c.id}>{c.label}</option>
				{/each}
			</select>
			{#if errors.campus}<p class={err}>{errors.campus}</p>{/if}
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div>
			<label class="label" for="location">Meeting point</label>
			<input
				id="location"
				name="location"
				class="field"
				bind:value={location}
				placeholder="Morewood Ave lot or “Online”"
				required
			/>
			{#if errors.location}<p class={err}>{errors.location}</p>{/if}
		</div>
		<div>
			<label class="label" for="startsAt">When</label>
			<input
				id="startsAt"
				name="startsAt"
				type="datetime-local"
				class="field"
				bind:value={startsAt}
				min={minStart}
				required
			/>
			<!-- The same moment as an absolute instant. The server can't work this
			     out: the field above carries no zone, so the server would read it
			     in its own, which on a UTC host is hours off. -->
			<input type="hidden" name="startsAtUtc" value={startsAtUtc} />
			{#if errors.startsAt}<p class={err}>{errors.startsAt}</p>{/if}
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<div>
			<label class="label" for="spots">Total spots</label>
			<input
				id="spots"
				name="spots"
				type="number"
				class="field"
				bind:value={spots}
				min={minSpots}
				max={MAX_SPOTS}
				inputmode="numeric"
				required
			/>
			<p class="mt-1 text-fluid-xs text-ink-muted">
				{#if minSpots > 2}
					{minSpots} already in. Raise this to let more people join.
				{:else}
					Including you.
				{/if}
			</p>
			{#if errors.spots}<p class={err}>{errors.spots}</p>{/if}
		</div>
		<div>
			<label class="label" for="cost">Cost</label>
			<div class="relative">
				<span
					class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fluid-sm text-ink-muted"
					>$</span
				>
				<input
					id="cost"
					name="cost"
					class="field pl-7"
					bind:value={cost}
					placeholder="0"
					inputmode="decimal"
				/>
			</div>
			<p class="mt-1 text-fluid-xs text-ink-muted">Leave blank if free.</p>
			{#if errors.costCents}<p class={err}>{errors.costCents}</p>{/if}
		</div>
		<div>
			<label class="label" for="costBasis">That's the…</label>
			<select id="costBasis" name="costBasis" class="field" bind:value={costBasis}>
				<option value="per-person">price per person</option>
				<option value="total">total, split evenly</option>
			</select>
			{#if preview}
				<p class="mt-1 text-fluid-xs font-bold text-brand-ink">{preview}</p>
			{/if}
		</div>
	</div>

	<!-- Who can find it, and who decides who gets in -->
	<fieldset class="rounded-lg bg-surface-sunk p-3">
		<!-- A <legend> is laid out on the fieldset's top border, so with a
		     background and no border it floats above the box instead of sitting
		     inside it. Kept for the grouping it gives a screen reader, with the
		     visible heading as an ordinary block. -->
		<legend class="sr-only">Who can join</legend>
		<p class="label px-1" aria-hidden="true">Who can join</p>

		<div class="grid gap-2 sm:grid-cols-2">
			{#each OPTIONS as option (option.id)}
				{@const locked = option.studentOnly && !student}
				<label
					class="flex gap-2.5 rounded-lg border-2 p-3 transition-colors {locked
						? 'cursor-not-allowed border-hedge opacity-55'
						: visibility === option.id
							? 'cursor-pointer border-brand-ink bg-brand-wash'
							: 'cursor-pointer border-hedge hover:border-hedge-strong'}"
				>
					<input
						type="radio"
						name="visibility"
						value={option.id}
						bind:group={visibility}
						disabled={locked}
						class="mt-0.5 accent-brand-ink"
					/>
					<span class="min-w-0">
						<span class="flex items-center gap-1.5 text-fluid-sm font-extrabold text-ink">
							<Icon name={option.icon} size={14} />
							{option.id === 'campus' ? `Just ${campusLabel}` : option.label}
						</span>
						<span class="mt-0.5 block text-fluid-xs text-ink-soft">
							{#if locked}
								Needs a verified .edu address.
							{:else}
								{option.blurb}
							{/if}
						</span>
					</span>
				</label>
			{/each}
		</div>
		{#if errors.visibility}<p class={err}>{errors.visibility}</p>{/if}

		<label class="mt-3 flex cursor-pointer items-start gap-2.5 px-1">
			<input
				type="checkbox"
				name="approvalRequired"
				bind:checked={approvalRequired}
				class="mt-0.5 size-4 shrink-0 accent-brand-ink"
			/>
			<span class="min-w-0">
				<span class="text-fluid-sm font-extrabold text-ink">Approve everyone who asks</span>
				<span class="mt-0.5 block text-fluid-xs text-ink-soft">
					Nobody gets in until you say yes. Leave this off and people take free spots themselves.
					You still approve anyone who asks once it's full.
				</span>
			</span>
		</label>
	</fieldset>

	<div>
		<label class="label" for="body"
			>Details <span class="font-semibold text-ink-muted">(optional)</span></label
		>
		<textarea
			id="body"
			name="body"
			class="field min-h-28 resize-y"
			bind:value={body}
			placeholder="How you'll collect money, what to bring, anything people should know."
			maxlength="2000"></textarea>
		{#if errors.body}<p class={err}>{errors.body}</p>{/if}
	</div>

	<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
		<a href={cancelHref} class="btn btn-ghost">Cancel</a>
		<button type="submit" class="btn btn-primary" disabled={submitting}>
			<Icon name="leaf" size={14} />
			{submitting ? busyLabel : submitLabel}
		</button>
	</div>
</form>
