/**
 * Free-text feed search via Gemini embeddings, in place of literal keyword
 * matching. "something related to martial arts or acrobatics" finds an
 * activity titled "tricking sesh" even though they share zero words —
 * that's the entire point over a plain `.includes()` search.
 *
 * Falls back to the caller's own keyword search if embeddings aren't
 * available right now (no API key, or the call fails), so search never
 * just breaks — it degrades to what it did before this existed.
 *
 * Document embeddings are cached in-process by activity id: the free tier
 * is rate-limited tightly enough that re-embedding the whole feed on every
 * search burns through it in a couple of searches. Only new/changed
 * activities and the query itself cost a real call after the first search
 * warms the cache.
 */
import { embedText, embedTexts } from './ai';
import { listActivities } from './db';
import { cosineSimilarity } from '$lib/matching';
import type { ActivityView, FeedQuery } from '$lib/types';
import type { Viewer } from './store/types';

/** Below this cosine similarity, an activity isn't really "about" the query. */
const MIN_SIMILARITY = 0.55;
/**
 * How loosely a query "hangs together" varies a lot — some queries clear
 * MIN_SIMILARITY for 5 activities, others for 40. Capping the count keeps
 * results reading as a curated match list either way, not "the whole feed,
 * vaguely reordered."
 */
const MAX_RESULTS = 10;

function activityText(a: ActivityView): string {
	return `${a.title}. ${a.body} Category: ${a.category}. Tags: ${a.interests.join(', ')}`;
}

/** id -> (embedding, the text it was computed from — invalidates on edit). */
const documentCache = new Map<string, { text: string; vector: number[] }>();

async function embedActivities(activities: ActivityView[]): Promise<(number[] | null)[]> {
	const texts = activities.map(activityText);
	const uncached = activities
		.map((a, i) => ({ a, text: texts[i] }))
		.filter(({ a, text }) => documentCache.get(a.id)?.text !== text);

	if (uncached.length > 0) {
		const fresh = await embedTexts(
			uncached.map((u) => u.text),
			'RETRIEVAL_DOCUMENT'
		);
		uncached.forEach(({ a, text }, j) => {
			if (fresh[j]) documentCache.set(a.id, { text, vector: fresh[j]! });
		});
	}

	return activities.map((a) => documentCache.get(a.id)?.vector ?? null);
}

/**
 * Re-ranks `activities` by semantic similarity to `query`. Returns null —
 * not an empty array, which would mean "no matches" — if embeddings aren't
 * available right now (no key, rate-limited, network error), so the caller
 * can fall back to keyword search instead of trusting a bogus all-zero score.
 */
export async function semanticSearch(
	query: string,
	activities: ActivityView[]
): Promise<ActivityView[] | null> {
	if (!query.trim() || activities.length === 0) return activities;

	const [queryVec, itemVecs] = await Promise.all([
		embedText(query, 'RETRIEVAL_QUERY'),
		embedActivities(activities)
	]);

	// If the query itself failed, or every single document embedding failed
	// (e.g. rate-limited), we have no real signal — don't pretend otherwise.
	if (!queryVec || itemVecs.every((v) => v === null)) return null;

	const scored = activities
		.map((activity, i) => ({
			activity,
			score: itemVecs[i] ? cosineSimilarity(queryVec, itemVecs[i]!) : 0
		}))
		.sort((a, b) => b.score - a.score);

	const matched = scored.filter((s) => s.score >= MIN_SIMILARITY);
	// Nothing cleared the bar — the closest few beats an empty page.
	const pool = matched.length > 0 ? matched : scored.slice(0, 3);

	return pool.slice(0, MAX_RESULTS).map((s) => s.activity);
}

/**
 * Same filters as `listActivities`, but `query.q` gets semantic search
 * instead of literal substring matching. Falls back to the plain keyword
 * behavior if embeddings aren't available right now.
 */
export async function listActivitiesWithSemanticSearch(
	query: FeedQuery,
	viewer: Viewer
): Promise<ActivityView[]> {
	if (!query.q) return listActivities(query, viewer);

	// Same campus/category/free/sort filters, minus the keyword gate —
	// semantic search replaces that step rather than narrowing after it.
	const candidates = await listActivities({ ...query, q: undefined }, viewer);
	const reranked = await semanticSearch(query.q, candidates);

	return reranked ?? listActivities(query, viewer);
}
