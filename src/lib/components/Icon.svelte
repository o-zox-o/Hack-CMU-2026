<script lang="ts" module>
	/* One file of stroke paths beats pulling an icon package into a hackathon
	   build. Add a name here and it is available everywhere. */
	export const ICON_PATHS = {
		home: 'M3 11l9-7 9 7v8a2 2 0 0 1-2 2h-4v-6H10v6H5a2 2 0 0 1-2-2z',
		compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5 13 13l-4.5 2.5L11 11z',
		search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20.5 20.5 16 16',
		plus: 'M12 5v14M5 12h14',
		clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5.2l3.4 2',
		pin: 'M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
		users:
			'M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5M16.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.8c2.1.6 3.5 2.2 3.5 5.2',
		comment: 'M20 4H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3v4l5-4h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z',
		dollar:
			'M12 3v18M16 7.4C16 5.7 14.2 5 12 5s-4 .9-4 2.6S9.8 10.2 12 10.2s4 .9 4 2.6-1.8 2.6-4 2.6-4-.9-4-2.6',
		calendar:
			'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 11h16M8 3v4M16 3v4',
		arrowUp: 'M12 19V6M5.5 12.5 12 6l6.5 6.5',
		arrowDown: 'M12 5v13M18.5 11.5 12 18l-6.5-6.5',
		user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
		menu: 'M4 7h16M4 12h16M4 17h16',
		close: 'M6 6l12 12M18 6 6 18',
		check: 'M5 12.5 9.5 17 19 7',
		leaf: 'M20 4C10 4 4 8.5 4 15c0 2 .6 3.6 1.6 5M20 4c0 10-5.5 15-14.4 16M20 4c1 7-2 11-7 12',
		exit: 'M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M11 8l-4 4 4 4M7 12h10'
	} as const;

	export type IconName = keyof typeof ICON_PATHS;
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		/** Pixel size — icons are square. */
		size?: number;
		class?: string;
		strokeWidth?: number;
	}

	let { name, size = 18, class: className = '', strokeWidth = 2 }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class="shrink-0 {className}"
	aria-hidden="true"
>
	<path d={ICON_PATHS[name]} />
</svg>
