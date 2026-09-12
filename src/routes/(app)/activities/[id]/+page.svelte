<script lang="ts">
	import { enhance } from '$app/forms';
	import CategoryBadge from '$lib/components/CategoryBadge.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import JoinButton from '$lib/components/JoinButton.svelte';
	import RatingBox from '$lib/components/RatingBox.svelte';
	import SpotsMeter from '$lib/components/SpotsMeter.svelte';
	import VisibilityBadge from '$lib/components/VisibilityBadge.svelte';
	import { costSplit, formatMiles, formatPrice, formatWhen, timeAgo } from '$lib/format';
	import { campusMeta } from '$lib/types';

	let { data, form } = $props();

	let activity = $derived(data.activity);
	let campus = $derived(campusMeta(activity.campus));

	/* The half of the price the host didn't type, against the full spot count. */
	let split = $derived(costSplit(activity.costCents, activity.costBasis, activity.spots));

	let commentDraft = $state('');
	let commentVisibility = $state<'everyone' | 'members'>('everyone');
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
				{#if activity.distanceMiles !== null}
					<span>{formatMiles(activity.distanceMiles)} away</span>
				{/if}
				<span aria-hidden="true">·</span>
				<a
					href="/u/{activity.host.handle}"
					class="inline-flex items-center gap-1 hover:text-ink hover:underline"
				>
					<Avatar user={activity.host} size="sm" />
					@{activity.host.handle}
				</a>
				<span aria-hidden="true">·</span>
				<time datetime={activity.createdAt}>{timeAgo(activity.createdAt)}</time>
				<VisibilityBadge visibility={activity.visibility} campus={activity.campus} />
				{#if activity.approvalRequired}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-surface-sunk px-2 py-0.5 font-bold text-ink-soft"
						title="The host approves everyone who joins"
					>
						<Icon name="check" size={11} strokeWidth={3} /> Host approves
					</span>
				{/if}
			</div>

			<div class="mt-2 flex flex-wrap items-start gap-x-3 gap-y-1">
				<h1 class="min-w-0 flex-1 text-fluid-2xl leading-tight font-extrabold text-ink">
					{activity.title}
				</h1>
				{#if activity.isHost}
					<a href="/activities/{activity.id}/edit" class="btn btn-ghost shrink-0 px-3 py-1">
						<Icon name="pencil" size={13} /> Edit
					</a>
				{/if}
			</div>

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
							{#if split}
								<span class="block text-fluid-xs font-semibold text-ink-muted">{split}</span>
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

			{#if activity.isHost && (activity.visibility !== 'public' || activity.approvalRequired)}
				<p class="mt-3 rounded-lg bg-surface-sunk px-3 py-2 text-fluid-xs text-ink-soft">
					{#if activity.visibility === 'private'}
						This one's private. It isn't in anyone's feed, so share the link with the people you
						want.
					{:else if activity.visibility === 'students'}
						Only people with a verified .edu address can see this.
					{:else if activity.visibility === 'campus'}
						Only {campus.label} students can see this.
					{/if}
					{#if activity.approvalRequired}
						Nobody joins until you approve them.
					{/if}
					<a href="/activities/{activity.id}/edit" class="font-bold text-brand-ink hover:underline">
						Change that
					</a>
				</p>
			{/if}

			<!-- Who's in -->
			<div class="mt-4">
				<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
					Who's in
				</h2>
				<ul class="mt-2 flex flex-wrap gap-2">
					{#each activity.members as member (member.id)}
						<li>
							<a
								href="/u/{member.handle}"
								class="inline-flex items-center gap-1.5 rounded-full bg-surface-sunk py-1 pr-3 pl-1 text-fluid-xs font-bold transition-colors hover:bg-surface-hover"
							>
								<Avatar user={member} size="sm" />
								{member.name}
								{#if member.id === activity.host.id}
									<span class="text-brand-ink">· host</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>

			{#if activity.waitlist.length === 0 && activity.isHost && activity.approvalRequired}
				<p class="mt-4 text-fluid-xs text-ink-muted">
					Nobody's asked to join yet. Requests show up here for you to approve.
				</p>
			{/if}

			{#if activity.waitlist.length > 0}
				<div class="mt-4">
					<h2 class="text-fluid-xs font-extrabold tracking-wider text-ink-muted uppercase">
						{#if activity.isHost}
							Asking to join · {activity.waitlist.length}
						{:else}
							Waiting · {activity.waitlist.length}
						{/if}
					</h2>
					<ul class="mt-2 flex flex-col gap-2">
						{#each activity.waitlist as person (person.id)}
							<li class="flex flex-wrap items-center gap-2 rounded-lg bg-surface-sunk px-2 py-1.5">
								<a href="/u/{person.handle}" class="flex items-center gap-2 hover:underline">
									<Avatar user={person} size="sm" />
									<span class="text-fluid-sm font-bold text-ink">{person.name}</span>
									<span class="text-fluid-xs text-ink-muted">@{person.handle}</span>
								</a>

								{#if activity.isHost}
									<span class="ml-auto flex gap-1.5">
										<form method="POST" action="?/decline" use:enhance>
											<input type="hidden" name="userId" value={person.id} />
											<button
												type="submit"
												class="rounded-full px-2.5 py-1 text-fluid-xs font-bold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
											>
												Decline
											</button>
										</form>
										<form method="POST" action="?/approve" use:enhance>
											<input type="hidden" name="userId" value={person.id} />
											<button type="submit" class="btn btn-primary px-3 py-1">
												<Icon name="check" size={13} strokeWidth={3} />
												Approve
											</button>
										</form>
									</span>
								{/if}
							</li>
						{/each}
					</ul>
					{#if activity.isHost}
						<p class="mt-2 text-fluid-xs text-ink-muted">
							{#if activity.isFull}
								You're full, so approving someone adds a spot. To make room for several,
								<a
									href="/activities/{activity.id}/edit"
									class="font-bold text-brand-ink hover:underline"
								>
									raise the spot count</a
								>.
							{:else}
								Approving takes one of your {activity.spotsLeft} free
								{activity.spotsLeft === 1 ? 'spot' : 'spots'}.
							{/if}
						</p>
					{/if}
				</div>
			{/if}

			<!-- Did it happen? Only the host can say, and nobody gets grass until they do. -->
			{#if activity.isComplete}
				<div
					class="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-brand-wash px-3 py-2 text-fluid-sm font-bold text-brand-ink"
				>
					<Icon name="check" size={15} strokeWidth={3} />
					This happened. Everyone who came got grass for it.
					{#if activity.isHost}
						<form method="POST" action="?/complete" class="ml-auto" use:enhance>
							<input type="hidden" name="complete" value="false" />
							<button
								type="submit"
								class="text-fluid-xs font-bold text-ink-muted hover:text-ink"
								title="Marked it by mistake?"
							>
								Undo
							</button>
						</form>
					{/if}
				</div>
			{:else if activity.isHost && activity.awaitingCompletion}
				<div class="mt-4 rounded-lg border-2 border-brand bg-brand-wash px-3 py-2.5">
					<p class="text-fluid-sm font-bold text-ink">Did this happen?</p>
					<p class="mt-0.5 text-fluid-xs text-ink-soft">
						Confirm it and everyone who came gets grass for it. Nobody's garden grows until you do.
					</p>
					<form method="POST" action="?/complete" class="mt-2" use:enhance>
						<button type="submit" class="btn btn-primary">
							<Icon name="check" size={14} strokeWidth={3} /> Mark as complete
						</button>
					</form>
				</div>
			{:else if activity.awaitingCompletion}
				<p class="mt-4 text-fluid-xs text-ink-muted">
					Waiting on {activity.host.name} to confirm this happened. It counts as grass once they do.
				</p>
			{/if}

			<RatingBox {activity} />

			<div class="mt-5">
				<JoinButton {activity} block />
			</div>
		</div>
	</article>

	<!-- Comments -->
	<section id="comments" class="leaf-card p-4 sm:p-5">
		<h2 class="text-fluid-lg font-extrabold text-ink">
			{data.comments.visible.length}
			{data.comments.visible.length === 1 ? 'comment' : 'comments'}
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
			<div class="flex flex-wrap items-center justify-end gap-2">
				<label class="sr-only" for="comment-visibility">Who can see this</label>
				<select
					id="comment-visibility"
					name="visibility"
					class="field w-auto py-1.5 text-fluid-xs"
					bind:value={commentVisibility}
				>
					<option value="everyone">Anyone who sees this activity</option>
					<option value="members">Only people who joined</option>
				</select>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={posting || commentDraft.trim() === ''}
				>
					{posting ? 'Posting…' : 'Comment'}
				</button>
			</div>
			<p class="text-right text-fluid-xs text-ink-muted">
				{#if commentVisibility === 'members'}
					Only the {activity.spotsTaken}
					{activity.spotsTaken === 1 ? 'person' : 'people'} in this activity will see it.
				{:else}
					Anyone who can open this activity will see it.
				{/if}
			</p>
		</form>

		{#if data.comments.hidden > 0}
			<p class="mt-3 rounded-lg bg-surface-sunk px-3 py-2 text-fluid-xs text-ink-muted">
				{data.comments.hidden}
				{data.comments.hidden === 1 ? 'comment is' : 'comments are'} hidden. Some people only share with
				whoever joined. Join to see {data.comments.hidden === 1 ? 'it' : 'them'}.
			</p>
		{/if}

		{#if data.comments.visible.length > 0}
			<ol class="mt-4 divide-y divide-hedge">
				{#each data.comments.visible as comment (comment.id)}
					<li class="flex gap-3 py-3">
						<a href="/u/{comment.author.handle}"><Avatar user={comment.author} /></a>
						<div class="min-w-0 flex-1">
							<p class="flex flex-wrap items-center gap-1.5 text-fluid-xs text-ink-muted">
								<a href="/u/{comment.author.handle}" class="font-bold text-ink hover:underline">
									@{comment.author.handle}
								</a>
								<span aria-hidden="true">·</span>
								<time datetime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
								{#if comment.visibility === 'members'}
									<span
										class="inline-flex items-center gap-1 rounded-full bg-surface-sunk px-2 py-0.5 font-bold text-ink-soft"
										title="Only people who joined this activity can see this"
									>
										<Icon name="lock" size={10} /> Private Comments for Joined Only
									</span>
								{/if}
							</p>
							<p class="mt-0.5 text-fluid-sm whitespace-pre-line text-ink-soft">{comment.body}</p>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
</div>
