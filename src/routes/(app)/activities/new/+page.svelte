<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import { formatCents, parseCents, perPersonCents, toLocalInputValue } from '$lib/format';
	import { CAMPUSES, CATEGORIES } from '$lib/types';
	import { MAX_SPOTS, type FieldErrors } from '$lib/validate';

	let { data, form } = $props();

	/* Sensible defaults: tomorrow at noon, 4 people, per-person pricing. */
	const tomorrowNoon = new Date();
	tomorrowNoon.setDate(tomorrowNoon.getDate() + 1);
	tomorrowNoon.setHours(12, 0, 0, 0);

	/* Seed the inputs once. `form.values` only comes back after a no-JS submit
	   failed validation; with JS the bound state below survives on its own. */
	// svelte-ignore state_referenced_locally
	const initial = { campus: data.defaultCampus, ...form?.values };

	let title = $state(initial.title ?? '');
	let body = $state(initial.body ?? '');
	let category = $state(initial.category ?? 'groceries');
	let campus = $state(initial.campus);
	let location = $state(initial.location ?? '');
	let startsAt = $state(initial.startsAt ?? toLocalInputValue(tomorrowNoon));
	let spots = $state(initial.spots ?? '4');
	let cost = $state(initial.cost ?? '');
	let costBasis = $state(initial.costBasis ?? 'per-person');

	let submitting = $state(false);
	let errors = $derived<FieldErrors>(form?.errors ?? {});

	/* Live "what each person pays" so the host sees the split before posting. */
	let preview = $derived.by(() => {
		const cents = parseCents(cost);
		const headcount = Number(spots);
		if (cents === null || cents === 0 || !Number.isInteger(headcount) || headcount < 1) return null;
		return formatCents(
			perPersonCents(cents, costBasis === 'total' ? 'total' : 'per-person', headcount)
		);
	});

	const minStart = toLocalInputValue(new Date());
</script>

<svelte:head>
	<title>New activity · Tagalong</title>
</svelte:head>

<div class="flex flex-col gap-3">
	<div class="leaf-card px-4 py-3">
		<h1 class="text-fluid-xl font-extrabold text-ink">Post an activity</h1>
		<p class="mt-0.5 text-fluid-sm text-ink-soft">
			Something you're doing anyway that other people could split.
		</p>
	</div>

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
				placeholder="Costco run Saturday — I drive, split gas"
				maxlength="120"
				required
			/>
			{#if errors.title}<p class="mt-1 text-fluid-xs font-bold text-berry-500">
					{errors.title}
				</p>{/if}
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="category">Category</label>
				<select id="category" name="category" class="field" bind:value={category}>
					{#each CATEGORIES as c (c.id)}
						<option value={c.id}>{c.label}</option>
					{/each}
				</select>
				{#if errors.category}<p class="mt-1 text-fluid-xs font-bold text-berry-500">
						{errors.category}
					</p>{/if}
			</div>
			<div>
				<label class="label" for="campus">Campus</label>
				<select id="campus" name="campus" class="field" bind:value={campus}>
					{#each CAMPUSES as c (c.id)}
						<option value={c.id}>{c.label}</option>
					{/each}
				</select>
				{#if errors.campus}<p class="mt-1 text-fluid-xs font-bold text-berry-500">
						{errors.campus}
					</p>{/if}
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
					placeholder="Morewood Ave lot — or “Online”"
					required
				/>
				{#if errors.location}<p class="mt-1 text-fluid-xs font-bold text-berry-500">
						{errors.location}
					</p>{/if}
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
				{#if errors.startsAt}<p class="mt-1 text-fluid-xs font-bold text-berry-500">
						{errors.startsAt}
					</p>{/if}
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
					min="2"
					max={MAX_SPOTS}
					inputmode="numeric"
					required
				/>
				<p class="mt-1 text-fluid-xs text-ink-muted">Including you.</p>
				{#if errors.spots}<p class="mt-1 text-fluid-xs font-bold text-berry-500">
						{errors.spots}
					</p>{/if}
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
				{#if errors.costCents}<p class="mt-1 text-fluid-xs font-bold text-berry-500">
						{errors.costCents}
					</p>{/if}
			</div>
			<div>
				<label class="label" for="costBasis">That's the…</label>
				<select id="costBasis" name="costBasis" class="field" bind:value={costBasis}>
					<option value="per-person">price per person</option>
					<option value="total">total, split evenly</option>
				</select>
				{#if preview}
					<p class="mt-1 text-fluid-xs font-bold text-brand-ink">≈ {preview} each</p>
				{/if}
			</div>
		</div>

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
			{#if errors.body}<p class="mt-1 text-fluid-xs font-bold text-berry-500">{errors.body}</p>{/if}
		</div>

		<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
			<a href="/" class="btn btn-ghost">Cancel</a>
			<button type="submit" class="btn btn-primary" disabled={submitting}>
				<Icon name="leaf" size={14} />
				{submitting ? 'Posting…' : 'Post activity'}
			</button>
		</div>
	</form>
</div>
