// src/lib/server/ai.ts
import { GoogleGenAI, Type } from '@google/genai';
import { env } from '$env/dynamic/private';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const tagSchema = {
	type: Type.OBJECT,
	properties: {
		tags: {
			type: Type.ARRAY,
			items: { type: Type.STRING },
			description:
				'3 to 6 lowercase, normalized keyword tags representing hobbies, interests, or activity topics.'
		}
	},
	required: ['tags']
};

//Shared tag generator: extracts normalized keyword tags from any raw description.
export async function generateTags(description: string): Promise<string[]> {
	if (!description || !description.trim()) {
		return [];
	}

	try {
		const response = await ai.models.generateContent({
			model: 'gemini-2.5-flash',
			//prompt - basic
			contents: `Analyze the following description and extract 3 to 6 normalized keyword tags.
Focus on activities, categories, hobbies, and relevant topics. Try to use the most common term for something as possible, for consistency, but accuracy
Format guidelines:
- All lowercase.
- Single words or simple hyphenated terms (e.g., "baking", "board-games", "rideshare", "groceries", "tennis").
- Avoid generic filler words like "fun", "cool", or "help".

Description:
"${description}"`,
			config: {
				responseMimeType: 'application/json',
				responseSchema: tagSchema,
				temperature: 0.2 // Low temperature - consistent, deterministic tags
			}
		});

		const parsed = JSON.parse(response.text ?? '{}');
		if (Array.isArray(parsed.tags)) {
			return parsed.tags.map((t: string) => t.trim().toLowerCase());
		}
		return [];
	} catch (error) {
		console.error('Gemini tag generation error:', error);
		return []; // Fails safely so form submissions still work
	}
}

/* -------------------------------------------------------------------------- */
/* Embeddings — for semantic feed search                                      */
/* -------------------------------------------------------------------------- */

const EMBEDDING_MODEL = 'gemini-embedding-001';
/** Gemini's default is much larger; this is plenty for cosine similarity over a small feed. */
const EMBEDDING_DIMENSIONS = 768;

export type EmbeddingTaskType = 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT';

/**
 * Text -> vectors, same order as input, batched into one request. An entry
 * is null if it couldn't be embedded (e.g. empty string); the whole array is
 * empty if the request itself failed (no API key, network error, etc.) so
 * callers can fall back to non-AI behavior instead of erroring.
 */
export async function embedTexts(
	texts: string[],
	taskType: EmbeddingTaskType
): Promise<(number[] | null)[]> {
	if (texts.length === 0) return [];

	try {
		const response = await ai.models.embedContent({
			model: EMBEDDING_MODEL,
			contents: texts,
			config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS }
		});
		return texts.map((_, i) => response.embeddings?.[i]?.values ?? null);
	} catch (error) {
		console.error('Gemini embedding error:', error);
		return texts.map(() => null);
	}
}

/** Convenience wrapper for a single text. */
export async function embedText(
	text: string,
	taskType: EmbeddingTaskType
): Promise<number[] | null> {
	const [vector] = await embedTexts([text], taskType);
	return vector ?? null;
}
