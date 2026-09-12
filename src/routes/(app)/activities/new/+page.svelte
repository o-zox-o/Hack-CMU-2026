<script lang="ts">
	import ActivityForm, { blankActivity } from '$lib/components/ActivityForm.svelte';
	import { campusMeta } from '$lib/types';

	let { data, form } = $props();

	/* `form.values` only comes back after a no-JS submit failed validation;
	   with JS the form's own state survives on its own. */
	// svelte-ignore state_referenced_locally
	const values = { ...blankActivity(data.defaultCampus), ...form?.values };
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

	<ActivityForm
		{values}
		errors={form?.errors}
		submitLabel="Post activity"
		busyLabel="Posting…"
		cancelHref="/"
		student={data.student}
		campusLabel={campusMeta(data.defaultCampus).short}
	/>
</div>
