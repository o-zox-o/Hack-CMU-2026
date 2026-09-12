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
			description: '3 to 6 lowercase, normalized keyword tags representing hobbies, interests, or activity topics.'
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