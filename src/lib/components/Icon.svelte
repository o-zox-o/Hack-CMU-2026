<script lang="ts" module>
	import {
		ArrowDown,
		ArrowUp,
		Calendar,
		CalendarCheck,
		Car,
		Check,
		Clock,
		Compass,
		DollarSign,
		Gift,
		Headphones,
		House,
		Leaf,
		LogOut,
		MapPin,
		Menu,
		Monitor,
		Moon,
		MessageSquare,
		Package,
		PartyPopper,
		Plus,
		Search,
		ShoppingCart,
		SlidersHorizontal,
		Sparkles,
		Sprout,
		Sun,
		User,
		Users,
		UtensilsCrossed,
		WashingMachine,
		X
	} from '@lucide/svelte';

	/* One place mapping our names to Lucide components, so call sites stay
	   `<Icon name="pin" />` and swapping an icon is a one-line change. */
	export const ICONS = {
		home: House,
		compass: Compass,
		search: Search,
		plus: Plus,
		clock: Clock,
		pin: MapPin,
		users: Users,
		comment: MessageSquare,
		dollar: DollarSign,
		calendar: Calendar,
		myActivities: CalendarCheck,
		arrowUp: ArrowUp,
		arrowDown: ArrowDown,
		user: User,
		menu: Menu,
		close: X,
		check: Check,
		leaf: Leaf,
		exit: LogOut,
		sliders: SlidersHorizontal,
		gift: Gift,
		sprout: Sprout,
		sparkles: Sparkles,
		sun: Sun,
		moon: Moon,
		monitor: Monitor,
		/* Categories */
		hangouts: PartyPopper,
		subscriptions: Headphones,
		groceries: ShoppingCart,
		rides: Car,
		food: UtensilsCrossed,
		supplies: Package,
		errands: WashingMachine,
		other: Sparkles
	} as const;

	export type IconName = keyof typeof ICONS;
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

	let Glyph = $derived(ICONS[name]);
</script>

<!--
	Keyed on `name` deliberately. Lucide renders its shapes through an unkeyed
	`{#each}` of `<svelte:element>`, so when the icon changes — including the
	hydration swap from the server's guess to the viewer's real theme — Svelte
	patches the new attributes onto the previous element tags. A moon's path
	then lands inside a <rect> and draws an empty box. Keying forces a fresh
	subtree, so every shape gets its correct tag.
-->
{#key name}
	<Glyph {size} {strokeWidth} class="shrink-0 {className}" aria-hidden="true" />
{/key}
