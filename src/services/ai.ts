import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type CommentSuggestions = { comments: string[] };

export class OpenAIService {
  async generatePostComments(
    profileHandle: string,
    caption: string,
    imageUrls: string[]
  ): Promise<string[]> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY not set");
      return [];
    }

    if (imageUrls.length === 0) {
        console.warn("No image URLs provided");
        return [];
    }

    const input: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
        model: "gpt-5-nano",
        // Optional:
        // store: false, // disable storage if you want :contentReference[oaicite:0]{index=0}
        instructions:`
You are a social media growth assistant acting on behalf of a girl's IG account.
Your have to generate 4 comment suggestions that can be commented on the post.
The goal is to use these comments to make others wanna follow her.
The comments should be very natural, just like a 21 yr girl might write.
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
        max_output_tokens: 500,
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
              required: ["comments"],
              properties: {
                comments: {
                  type: "array",
                  description:
                    "A list of 4 engaging, visual-focused, casual Instagram comments.",
                  minItems: 4,
                  maxItems: 4,
                  items: { type: "string" },
                },
              },
            },
          },
        },
      }

    try {
      const response = await openai.responses.create(input);

      // Convenience helper in Responses API :contentReference[oaicite:3]{index=3}
      const text = response.output_text;
      if (!text) return [];

      const parsed = JSON.parse(text) as CommentSuggestions;
      const comments = Array.isArray(parsed?.comments) ? parsed.comments : [];

      // Defensive cleanup
      return comments
        .map((c) => (typeof c === "string" ? c.trim() : ""))
        .filter(Boolean)
        .slice(0, 4);
    } catch (error) {
      console.error("Error generating comments:", error);
      return [];
    }
  }
}
