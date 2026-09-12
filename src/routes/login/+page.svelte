<script lang="ts">
	import { enhance } from '$app/forms';
	import GrassIcon from '$lib/components/GrassIcon.svelte';
	import { CAMPUSES } from '$lib/types';
	import type { AuthErrors } from '$lib/validate';

	let { data, form } = $props();

	/* A failed submit keeps you on the tab you were on. Initial value on purpose. */
	// svelte-ignore state_referenced_locally
	let mode = $state<'login' | 'signup'>(form?.mode ?? data.mode);
	/* Signup is two steps: fill the form, then enter the code we emailed.
	   $state (not $derived) because "‹ Back" needs to leave verify without a
	   new form result to react to — but it does need to react to a fresh
	   result either direction: form -> verify on a successful signup submit,
	   staying on verify after a wrong code, or back to form if the email
	   turned out to be taken (nowhere on the verify step to show that). */
	// svelte-ignore state_referenced_locally
	let step = $state<'form' | 'verify'>(form?.step === 'verify' ? 'verify' : 'form');
	$effect(() => {
		if (form?.step === 'verify' || form?.step === 'form') step = form.step;
	});
	let errors = $derived<AuthErrors>(form?.errors ?? {});
	let busy = $state(false);

	// svelte-ignore state_referenced_locally
	const echo = { name: '', email: '', campus: 'cmu', ...form };
	let name = $state(echo.name ?? '');
	let email = $state(echo.email ?? '');
	let campus = $state(echo.campus || 'cmu');

	function switchTab(next: 'login' | 'signup') {
		mode = next;
		step = 'form';
	}

	let actionQuery = $derived(data.next === '/' ? '' : `&next=${encodeURIComponent(data.next)}`);

	const tab = 'flex-1 rounded-md py-1.5 text-center text-fluid-sm font-bold transition-colors';
</script>

<svelte:head>
	<title>{mode === 'signup' ? 'Sign up' : 'Log in'} · Tagalong</title>
</svelte:head>

<main class="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter py-10">
	<a href="/login" class="flex items-center gap-2" aria-label="Tagalong">
		<span
			class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-on-brand"
		>
			<GrassIcon size={22} strokeWidth={2.25} />
		</span>
		<span class="text-fluid-2xl font-extrabold tracking-tight text-ink">tagalong</span>
	</a>

	<div class="leaf-card w-full max-w-md p-5 sm:p-7">
		<!-- Log in / Sign up switch -->
		<div class="flex gap-1 rounded-lg bg-surface-sunk p-1" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'login'}
				class="{tab} {mode === 'login'
					? 'bg-surface text-ink shadow-lift'
					: 'text-ink-muted hover:text-ink'}"
				onclick={() => switchTab('login')}
			>
				Log in
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'signup'}
				class="{tab} {mode === 'signup'
					? 'bg-surface text-ink shadow-lift'
					: 'text-ink-muted hover:text-ink'}"
				onclick={() => switchTab('signup')}
			>
				Sign up
			</button>
		</div>

		<h1 class="mt-5 text-fluid-xl font-extrabold text-ink">
			{#if mode === 'signup' && step === 'verify'}
				Check your email
			{:else if mode === 'signup'}
				Create your account
			{:else}
				Welcome back
			{/if}
		</h1>
		<p class="mt-0.5 text-fluid-sm text-ink-soft">
			{#if mode === 'signup' && step === 'verify'}
				We sent a code to <span class="font-bold text-ink">{form?.email}</span> — enter it below to finish
				creating your account.
			{:else if mode === 'signup'}
				Post what you’re doing anyway and let your campus tag along.
			{:else}
				Log in to see what’s happening on your campus.
			{/if}
		</p>

		{#if errors.form}
			<p
				class="mt-4 rounded-md bg-berry-500/10 px-3 py-2 text-fluid-sm font-bold text-berry-500"
				role="alert"
			>
				{errors.form}
			</p>
		{/if}

		{#if mode === 'signup' && step === 'verify'}
			<form
				method="POST"
				action="?/verifyCode{actionQuery}"
				class="mt-4 flex flex-col gap-4"
				use:enhance={() => {
					busy = true;
					return async ({ update }) => {
						busy = false;
						await update({ reset: false });
					};
				}}
			>
				<div>
					<label class="label" for="code">Verification code</label>
					<input
						id="code"
						name="code"
						class="field"
						inputmode="numeric"
						autocomplete="one-time-code"
						placeholder="123456"
						required
					/>
				</div>

				<button type="submit" class="btn btn-primary mt-1 w-full" disabled={busy}>
					{#if busy}
						One sec…
					{:else}
						Verify & create account
					{/if}
				</button>

				<button
					type="button"
					class="text-fluid-xs font-bold text-ink-muted hover:text-ink"
					onclick={() => (step = 'form')}
				>
					‹ Back
				</button>
			</form>
		{:else}
			<form
				method="POST"
				action="?/{mode}{actionQuery}"
				class="mt-4 flex flex-col gap-4"
				use:enhance={() => {
					busy = true;
					return async ({ update }) => {
						busy = false;
						await update({ reset: false });
					};
				}}
			>
				{#if mode === 'signup'}
					<div>
						<label class="label" for="name">Name</label>
						<input
							id="name"
							name="name"
							class="field"
							bind:value={name}
							autocomplete="name"
							required
						/>
						{#if errors.name}<p class="mt-1 text-fluid-xs font-bold text-berry-500">
								{errors.name}
							</p>{/if}
					</div>
				{/if}

				<div>
					<label class="label" for="email">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						class="field"
						bind:value={email}
						placeholder="you@andrew.cmu.edu"
						autocomplete="email"
						required
					/>
					{#if errors.email}<p class="mt-1 text-fluid-xs font-bold text-berry-500">
							{errors.email}
						</p>{/if}
				</div>

				{#if mode === 'signup'}
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
				{/if}

				<div>
					<label class="label" for="password">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						class="field"
						autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
						minlength={mode === 'signup' ? 8 : undefined}
						required
					/>
					{#if errors.password}<p class="mt-1 text-fluid-xs font-bold text-berry-500">
							{errors.password}
						</p>{/if}
				</div>

				<button type="submit" class="btn btn-primary mt-1 w-full" disabled={busy}>
					{#if busy}
						One sec…
					{:else if mode === 'signup'}
						Create account
					{:else}
						Log in
					{/if}
				</button>
			</form>
		{/if}

		{#if data.demo}
			<p class="mt-5 border-t border-hedge pt-4 text-fluid-xs text-ink-muted">
				<span class="font-bold">Dev:</span> every seeded account uses
				<code class="rounded bg-surface-sunk px-1">{data.demo.password}</code> — e.g.
				<button
					type="button"
					class="font-bold text-brand-ink hover:underline"
					onclick={() => {
						mode = 'login';
						email = data.demo?.email ?? '';
					}}
				>
					{data.demo.email}
				</button>
			</p>
		{/if}
	</div>

	<p class="text-fluid-xs text-ink-muted">Hack CMU 2026 · Built in Pittsburgh</p>
</main>
