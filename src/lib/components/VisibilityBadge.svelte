<script lang="ts">
	import { campusMeta, type CampusId, type Visibility } from '$lib/types';
	import Icon, { type IconName } from './Icon.svelte';

	interface Props {
		visibility: Visibility;
		/** Named on the campus badge so it reads "CMU only", not "campus only". */
		campus: CampusId;
		size?: number;
	}

	let { visibility, campus, size = 11 }: Props = $props();

	/* Public needs no badge: it's what everything is unless said otherwise. */
	let badge = $derived.by((): { icon: IconName; label: string; title: string } | null => {
		if (visibility === 'students') {
			return {
				icon: 'sprout',
				label: 'Students',
				title: 'Only people with a verified .edu address can see this'
			};
		}
		if (visibility === 'campus') {
			const school = campusMeta(campus).short;
			return {
				icon: 'pin',
				label: `${school} only`,
				title: `Only students at ${campusMeta(campus).label} can see this`
			};
		}
		if (visibility === 'private') {
			return {
				icon: 'lock',
				label: 'Private',
				title: 'Not in any feed. Only people with the link can open it'
			};
		}
		return null;
	});
</script>

{#if badge}
	<span
		class="inline-flex items-center gap-1 rounded-full bg-surface-sunk px-2 py-0.5 font-bold text-ink-soft"
		title={badge.title}
	>
		<Icon name={badge.icon} {size} />
		{badge.label}
	</span>
{/if}
