<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<main class="mx-auto flex max-w-md flex-col gap-4 p-8 text-center">
	<h1 class="text-2xl font-semibold">This app is for verified college students</h1>
	<p class="text-gray-600">
		We couldn't match your email to an eligible school. Sign up with your college email address.
	</p>
	<a href={resolve('/login')} class="text-blue-600 underline">Try a different email</a>
</main>
