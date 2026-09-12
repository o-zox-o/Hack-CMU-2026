<script lang="ts">
	import { formatMiles, formatPrice, formatWhen, timeAgo } from '$lib/format';
	import { campusMeta, categoryMeta, type ActivityView } from '$lib/types';
	import Avatar from './Avatar.svelte';
	import Icon from './Icon.svelte';
	import JoinButton from './JoinButton.svelte';
	import SpotsMeter from './SpotsMeter.svelte';
	import VisibilityBadge from './VisibilityBadge.svelte';

	interface Props {
		activity: ActivityView;
	}

	let { activity }: Props = $props();

	let href = $derived(`/activities/${activity.id}`);
	let campus = $derived(campusMeta(activity.campus));
	let category = $derived(categoryMeta(activity.category));
	let free = $derived(activity.costCents === 0);
</script>

<article
	class="leaf-card flex overflow-hidden transition-[border-color,box-shadow] hover:border-hedge-strong hover:shadow-lift"
>
	<!-- Category tile in the left gutter — links into the filtered feed. -->
	<a
		href="/?category={activity.category}"
		class="flex w-12 shrink-0 flex-col items-center gap-1 bg-surface-sunk pt-3 transition-colors hover:bg-brand-wash sm:w-14"
		aria-label="All {category.label.toLowerCase()} activities"
	>
		<Icon name={category.icon} size={20} />
		{#if activity.matchPercent !== null}
			<!-- Stacked, because the gutter is only ~48px wide. -->
			<span
				class="flex flex-col items-center leading-none"
				title="{activity.matchPercent}% match with your interests"
			>
				<span
					class="text-fluid-xs font-extrabold tabular-nums {activity.matchPercent >= 50
						? 'text-brand-ink'
						: 'text-ink-muted'}"
				>
					{activity.matchPercent}%
				</span>
				<span class="mt-0.5 text-[0.58rem] font-bold tracking-wide text-ink-muted uppercase">
					match
				</span>
			</span>
		{/if}
	</a>

	<div class="min-w-0 flex-1 px-3 py-2.5 sm:px-4">
		<!-- Meta row: category · campus · host · age -->
		<div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-fluid-xs text-ink-muted">
			<a href="/?category={activity.category}" class="font-bold text-brand-ink hover:underline">
				{category.label}
			</a>
			<span aria-hidden="true">·</span>
			<span class="font-bold">{campus.short}</span>
			{#if activity.distanceMiles !== null}
				<span aria-hidden="true">·</span>
				<span>{formatMiles(activity.distanceMiles)}</span>
			{/if}
			<span aria-hidden="true">·</span>
			<a
				href="/u/{activity.host.handle}"
				class="inline-flex items-center gap-1 hover:text-ink hover:underline"
			>
				<Avatar user={activity.host} size="sm" />
				<span>@{activity.host.handle}</span>
			</a>
			<span aria-hidden="true">·</span>
			<time datetime={activity.createdAt}>{timeAgo(activity.createdAt)}</time>
			<VisibilityBadge visibility={activity.visibility} campus={activity.campus} />
			{#if activity.isWildcard}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-wildcard-wash px-2 py-0.5 font-bold text-wildcard-ink"
					title="Not your usual thing, that's the point"
				>
					<Icon name="sparkles" size={11} /> Wildcard
				</span>
			{/if}
		</div>

		<!-- Title + preview -->
		<a {href} class="mt-1.5 block">
			<h2 class="text-fluid-lg leading-snug font-extrabold text-ink hover:text-brand-ink">
				{activity.title}
			</h2>
			{#if activity.body}
				<p class="mt-1 line-clamp-2 text-fluid-sm text-ink-soft">{activity.body}</p>
			{/if}
		</a>

		<!-- Facts row -->
		<dl class="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-fluid-xs font-semibold text-ink-soft">
			<div class="flex items-center gap-1">
				<dt class="sr-only">When</dt>
				<Icon name="clock" size={14} />
				<dd>{formatWhen(activity.startsAt)}</dd>
			</div>
			<div class="flex min-w-0 items-center gap-1">
				<dt class="sr-only">Where</dt>
				<Icon name="pin" size={14} />
				<dd class="truncate">{activity.location}</dd>
			</div>
			<div class="flex items-center gap-1">
				<dt class="sr-only">Cost</dt>
				{#if free}
					<dd class="rounded-full bg-free-wash px-2 py-0.5 font-bold text-free-ink">Free</dd>
				{:else}
					<Icon name="dollar" size={14} />
					<dd class="text-brand-ink">{formatPrice(activity.costCents, activity.costBasis)}</dd>
				{/if}
			</div>
		</dl>

		<!-- Action row -->
		<div class="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
			<SpotsMeter taken={activity.spotsTaken} total={activity.spots} />
			<a
				href="{href}#comments"
				class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-fluid-xs font-bold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
			>
				<Icon name="comment" size={14} />
				{activity.commentCount}
				<span class="hidden sm:inline">{activity.commentCount === 1 ? 'comment' : 'comments'}</span>
			</a>
			<div class="ml-auto">
				<JoinButton {activity} />
			</div>
		</div>
	</div>
</article>
