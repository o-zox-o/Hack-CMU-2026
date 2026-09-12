<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import GrassIcon from '$lib/components/GrassIcon.svelte';
	import InterestPicker from '$lib/components/InterestPicker.svelte';

	let { data } = $props();

	let bio = $state('');
	let saving = $state(false);

	let action = $derived(data.next === '/' ? '' : `?next=${encodeURIComponent(data.next)}`);
</script>

<svelte:head>
	<title>Set up your profile · Tagalong</title>
</svelte:head>

<main class="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center gap-5 px-gutter py-10">
	<div>
		<span
			class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-on-brand"
		>
			<GrassIcon size={22} strokeWidth={2.25} />
		</span>
		<h1 class="text-fluid-2xl font-extrabold text-ink">You're in. One quick thing.</h1>
		<p class="mt-1 text-fluid-base text-ink-soft">
			Your interests decide what lands at the top of your feed. The rest is what people see when
			they're deciding whether to tag along with you.
		</p>
	</div>

	<form
		method="POST"
		{action}
		class="leaf-card flex flex-col gap-5 p-5 sm:p-6"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				saving = false;
				await update();
			};
		}}
	>
		<div>
			<span class="label">
				What are you into?
				<span class="font-semibold text-brand-ink">— this builds your feed</span>
			</span>
			<InterestPicker />
		</div>

		<div>
			<label class="label" for="bio">
				A line about you <span class="font-semibold text-ink-muted">(optional)</span>
			</label>
			<textarea
				id="bio"
				name="bio"
				class="field min-h-20 resize-y"
				bind:value={bio}
				maxlength="300"
				placeholder="Junior in ECE. Perpetually organizing the Costco run."></textarea>
		</div>

		<div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
			<a href={data.next} class="btn btn-ghost">Skip for now</a>
			<button type="submit" class="btn btn-primary" disabled={saving}>
				{saving ? 'Saving…' : 'Start browsing'}
				<Icon name="arrowUp" size={14} class="rotate-90" />
			</button>
		</div>
	</form>

	<p class="text-center text-fluid-xs text-ink-muted">
		You can change any of this later from your profile.
	</p>
</main>
