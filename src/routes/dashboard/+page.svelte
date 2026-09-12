<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<main class="mx-auto flex max-w-md flex-col gap-4 p-8">
	<h1 class="text-2xl font-semibold">Welcome, {data.user.name ?? data.user.email}</h1>
	<p class="text-gray-600">{data.user.email}</p>
	<a href={resolve('/logout')} class="text-blue-600 underline">Log out</a>
</main>
