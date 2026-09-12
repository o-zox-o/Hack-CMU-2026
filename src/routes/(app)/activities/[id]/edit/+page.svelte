<script lang="ts">
	import ActivityForm, { activityToForm } from '$lib/components/ActivityForm.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { campusMeta } from '$lib/types';

	let { data, form } = $props();

	let activity = $derived(data.activity);

	// svelte-ignore state_referenced_locally
	const values = activityToForm(data.activity);

	let waiting = $derived(activity.waitlist.length);
</script>

<svelte:head>
	<title>Edit {activity.title} · Tagalong</title>
</svelte:head>

<div class="flex flex-col gap-3">
	<a
		href="/activities/{activity.id}"
		class="inline-flex items-center gap-1 text-fluid-xs font-bold text-ink-muted hover:text-ink"
	>
		<Icon name="arrowUp" size={14} class="-rotate-90" /> Back to the activity
	</a>

	<div class="leaf-card px-4 py-3">
		<h1 class="text-fluid-xl font-extrabold text-ink">Edit activity</h1>
		<p class="mt-0.5 text-fluid-sm text-ink-soft">
			{activity.spotsTaken} of {activity.spots} spots taken.
			{#if waiting > 0}
				{waiting}
				{waiting === 1 ? 'person is' : 'people are'} waiting on you. You can
				<a href="/activities/{activity.id}" class="font-bold text-brand-ink hover:underline">
					approve {waiting === 1 ? 'them' : 'anyone'} from the activity page</a
				>, or add spots here first.
			{:else}
				Everyone already in keeps their spot.
			{/if}
		</p>
	</div>

	<ActivityForm
		{values}
		errors={form?.errors}
		submitLabel="Save changes"
		busyLabel="Saving…"
		cancelHref="/activities/{activity.id}"
		minSpots={activity.spotsTaken}
		student={data.student}
		campusLabel={campusMeta(activity.campus).short}
	/>
</div>
