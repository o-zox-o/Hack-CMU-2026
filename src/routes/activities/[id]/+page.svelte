<script lang="ts">
	import { enhance } from '$app/forms';
	import CategoryBadge from '$lib/components/CategoryBadge.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import JoinButton from '$lib/components/JoinButton.svelte';
	import SpotsMeter from '$lib/components/SpotsMeter.svelte';
	import { formatCents, formatPrice, formatWhen, perPersonCents, timeAgo } from '$lib/format';
	import { campusMeta } from '$lib/types';

	let { data, form } = $props();

	let activity = $derived(data.activity);
	let campus = $derived(campusMeta(activity.campus));

	/* What one person actually pays, given who's in right now. */
	let eachPays = $derived(
		activity.costCents === 0
			? null
			: formatCents(perPersonCents(activity.costCents, activity.costBasis, activity.spotsTaken))
	);

	let commentDraft = $state('');
	let posting = $state(false);
</script>

<svelte:head>
	<title>{activity.title} · Tagalong</title>
</svelte:head>

<div class="flex flex-col gap-3">
	<a
		href="/"
		class="inline-flex items-center gap-1 text-fluid-xs font-bold text-ink-muted hover:text-ink"
	>
		<Icon name="arrowUp" size={14} class="-rotate-90" /> Back to feed
	</a>

	{#if form?.message}
		<p
			class="rounded-lg bg-berry-500/10 px-3 py-2 text-fluid-sm font-bold text-berry-500"
			role="alert"
		>
			{form.message}
		</p>
	{/if}

	<!-- The post -->
	<article class="leaf-card flex overflow-hidden">
		<div class="min-w-0 flex-1 px-4 py-3 sm:px-5 sm:py-4">
			<div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-fluid-xs text-ink-muted">
				<CategoryBadge category={activity.category} href="/?category={activity.category}" />
				<span class="font-bold">{campus.label}</span>
				<span aria-hidden="true">·</span>
				<span class="inline-flex items-center gap-1">
					<Avatar user={activity.host} size="sm" />
					@{activity.host.handle}
				</span>
				<span aria-hidden="true">·</span>
				<time datetime={activity.createdAt}>{timeAgo(activity.createdAt)}</time>
			</div>

			<h1 class="mt-2 text-fluid-2xl leading-tight font-extrabold text-ink">{activity.title}</h1>

			{#if activity.body}
				<p class="mt-3 text-fluid-base whitespace-pre-line text-ink-soft">{activity.body}</p>
			{/if}

			<!-- Facts grid -->
			<dl class="mt-4 grid gap-3 rounded-lg bg-surface-sunk p-3 text-fluid-sm sm:grid-cols-2">
				<div class="flex items-start gap-2">
					<Icon name="calendar" size={16} class="mt-0.5 text-brand-ink" />
					<div>
						<dt class="text-fluid-xs font-bold tracking-wide text-ink-muted uppercase">When</dt>
						<dd class="font-bold text-ink">{formatWhen(activity.startsAt)}</dd>
					</div>
				</div>
				<div class="flex items-start gap-2">
					<Icon name="pin" size={16} class="mt-0.5 text-brand-ink" />
					<div>
						<dt class="text-fluid-xs font-bold tracking-wide text-ink-muted uppercase">Where</dt>
						<dd class="font-bold text-ink">{activity.location}</dd>
					</div>
				</div>
				<div class="flex items-start gap-2">
					<Icon name="dollar" size={16} class="mt-0.5 text-brand-ink" />
					<div>
						<dt class="text-fluid-xs font-bold tracking-wide text-ink-muted uppercase">Cost</dt>
						<dd class="font-bold text-ink">
							{formatPrice(activity.costCents, activity.costBasis)}
							{#if eachPays && activity.costBasis === 'total'}
								<span class="font-semibold text-ink-muted"
									>— {eachPays} each with {activity.spotsTaken} in</span
								>
							{/if}
						</dd>
					</div>
				</div>
				<div class="flex items-start gap-2">
					<Icon name="users" size={16} class="mt-0.5 text-brand-ink" />
					<div>
						<dt class="text-fluid-xs font-bold tracking-wide text-ink-muted uppercase">Spots</dt>
						<dd class="font-bold text-ink">
							{activity.spotsTaken} of {activity.spots} ·
							<SpotsMeter taken={activity.spotsTaken} total={activity.spots} dots={false} />
						</dd>
					</div>
				</div>
			</dl>

			<!-- Who's in -->
			<div class="mt-4">
				<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
					Who's in
				</h2>
				<ul class="mt-2 flex flex-wrap gap-2">
					{#each activity.members as member (member.id)}
						<li
							class="inline-flex items-center gap-1.5 rounded-full bg-surface-sunk py-1 pr-3 pl-1 text-fluid-xs font-bold"
						>
							<Avatar user={member} size="sm" />
							{member.name}
							{#if member.id === activity.host.id}
								<span class="text-brand-ink">· host</span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>

			<div class="mt-5">
				<JoinButton {activity} block />
			</div>
		</div>
	</article>

	<!-- Comments -->
	<section id="comments" class="leaf-card p-4 sm:p-5">
		<h2 class="text-fluid-lg font-extrabold text-ink">
			{data.comments.length}
			{data.comments.length === 1 ? 'comment' : 'comments'}
		</h2>

		<form
			method="POST"
			action="?/comment"
			class="mt-3 flex flex-col gap-2"
			use:enhance={() => {
				posting = true;
				return async ({ result, update }) => {
					posting = false;
					if (result.type === 'success') commentDraft = '';
					await update({ reset: false });
				};
			}}
		>
			<label class="sr-only" for="comment-body">Add a comment</label>
			<textarea
				id="comment-body"
				name="body"
				class="field min-h-20 resize-y"
				placeholder="Ask a question or call dibs on the back seat…"
				bind:value={commentDraft}
				maxlength="1000"
				required></textarea>
			<div class="flex justify-end">
				<button
					type="submit"
					class="btn btn-primary"
					disabled={posting || commentDraft.trim() === ''}
				>
					{posting ? 'Posting…' : 'Comment'}
				</button>
			</div>
		</form>

		{#if data.comments.length > 0}
			<ol class="mt-4 divide-y divide-hedge">
				{#each data.comments as comment (comment.id)}
					<li class="flex gap-3 py-3">
						<Avatar user={comment.author} />
						<div class="min-w-0 flex-1">
							<p class="text-fluid-xs text-ink-muted">
								<span class="font-bold text-ink">@{comment.author.handle}</span>
								· <time datetime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
							</p>
							<p class="mt-0.5 text-fluid-sm whitespace-pre-line text-ink-soft">{comment.body}</p>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
</div>
