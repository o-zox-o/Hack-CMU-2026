<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let email = $derived(page.url.searchParams.get('email') ?? 'your inbox');
</script>

<main class="mx-auto flex max-w-md flex-col gap-4 p-8 text-center">
	<h1 class="text-2xl font-semibold">Check your email</h1>
	<p class="text-gray-600">
		We sent a verification link to <strong>{email}</strong>. Click it, then come back and sign in.
	</p>
	<a href={resolve('/login')} class="text-blue-600 underline">Back to sign in</a>
</main>
