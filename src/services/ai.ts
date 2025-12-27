import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

import { CommentSuggestionResponse } from '../../shared/types';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAIService {
  async generatePostComments(
    profileHandle: string,
    caption: string,
    imageUrls: string[],
    additionalContext?: string
  ): Promise<CommentSuggestionResponse | null> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY not set");
      return null;
    }

    if (imageUrls.length === 0) {
        console.warn("No image URLs provided");
        return null;
    }
    
    const contextInstruction = additionalContext ? `\n\nEXTRA CONTEXT TO CONSIDER: "${additionalContext}"\nUse this context to tailor the comments specific to the user's thought.` : '';

    const input: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
        model: "gpt-5-mini",
        // Optional:
        // store: false, // disable storage if you want :contentReference[oaicite:0]{index=0}
        instructions:`
# ROLE
You are an expert social media growth assistant managing an Instagram account for a 30-year-old woman.
Your goal is to generate comments that attract attention and encourage others to follow her account.

# PERSONA
She’s an LA-based, fitness-forward lifestyle creator with a cozy, cinematic soft-glow vibe. Playful, confident, and subtly flirty, she enjoys feeling attractive and sometimes leans into a sexy, empowered side. She likes turning heads and craves the right kind of male attention—admiring, respectful, drawn to her confidence. She mixes gym discipline with cozy home energy, speaks with a modern, witty tone, and stays social, warm, and a bit mysterious. Strong self-respect, clear boundaries, and a vibe of “sun-kissed LA + cozy indoors + earned confidence.”

# COMMENT TONE
- **Style**: Casual phrasing, reacts to specific visual details, or laughs at relatable memes and uses light punctuation. 
- **Expressions**: Use candid reactions like "hahahaha" or "loveee it!" where appropriate.
- **Emojis**: Use relevant emojis to enhance the comment, but don't overdo it.

# CONSTRAINTS
- **NO Generic Words**: Avoid "everything", "obsessed", "vibes", etc.
- **NO Em-dashes**: Never use "—".
- **Length**: Keep comments short and punchy.
- **No Self-Promotion**: Do not explicitly say "follow me". The content itself should be the hook.

# TASK
1. Analyze the provided image(s) and caption.
2. Generate a **Commentability Score (0-10)** based on how natural it is for this girl's persona to comment on this post. (10 = Most natural, 0 = Feels forced).
3. Generate **4 unique comment options** adhering to the persona above.
${contextInstruction}
        `,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: `Author: @${profileHandle}` },
              { type: "input_text", text: `Caption: ${caption}` },
              ...imageUrls.map((url) => ({
                type: "input_image" as const,
                image_url: url,
                detail: "high" as const,
              })),
            ],
          },
        ],
        max_output_tokens: 1000,
        reasoning: {effort: "minimal"},

        // Responses API uses `text.format` (not `response_format`) for Structured Outputs :contentReference[oaicite:2]{index=2}
        text: {
          format: {
            type: "json_schema",
            name: "comment_suggestions",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["comments", "score"],
               properties: {
                comments: {
                  type: "array",
                  description:
                    "A list of 4 engaging, visual-focused, casual Instagram comments.",
                  minItems: 4,
                  maxItems: 4,
                  items: { type: "string" },
                },
                score: {
                    type: "number",
                    description: "A score from 0-10 indicating how comment-worthy this post is.",
                    minimum: 0,
                    maximum: 10
                }
              },
            },
          },
        },
      }

    try {
      console.log(`Generating comments for @${profileHandle} with ${imageUrls.length} images...`);
      const response = await openai.responses.create(input);

      // Convenience helper in Responses API :contentReference[oaicite:3]{index=3}
      const text = response.output_text;
      if (!text) {
          console.warn("No output text returned");
          return null;
      }

      const parsed = JSON.parse(text) as CommentSuggestionResponse;
      const comments = Array.isArray(parsed?.comments) ? parsed.comments : [];
      
      console.log(`Generated ${comments.length} comments for @${profileHandle}, Score: ${parsed.score}`);

      return {
          comments: comments.map((c) => (typeof c === "string" ? c.trim() : "")).filter(Boolean).slice(0, 4),
          score: typeof parsed.score === 'number' ? parsed.score : 0
      };
    } catch (error) {
      console.error("Error generating comments:", error);
      return null;
    }
  }
}
