<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<main class="mx-auto flex max-w-md flex-col gap-4 p-8 text-center">
	<h1 class="text-3xl font-semibold">Travel Buddy</h1>
	<p class="text-gray-600">Find travel buddies from verified college students.</p>

	{#if data.user}
		<p class="text-gray-600">Signed in as {data.user.email}</p>
		<a href={resolve('/dashboard')} class="text-blue-600 underline">Go to dashboard</a>
		<a href={resolve('/logout')} class="text-blue-600 underline">Log out</a>
	{:else}
		<a href={resolve('/login')} class="text-blue-600 underline"
			>Sign up / Log in with your college email</a
		>
	{/if}
</main>
