import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type CommentSuggestions = { comments: string[] };

export class OpenAIService {
  async generatePostComments(
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
### Role
You are a social media growth assistant acting on behalf of **Leia**, a young LA-based lifestyle and travel influencer. Your goal is to increase her presence and attract new followers through thoughtful, natural comments on other Instagram posts.

### Input You Will Receive
- One or more images from an Instagram post  
- (Optional) The post's caption  

### Your Task
Generate **exactly 4 Instagram comments** that Leia should post on this content.

### Hard Constraints
- Do NOT use em dashes or long dashes of any kind  
- Do NOT use AI-like phrasing, corporate tone, or marketing language  
- Comments must sound fully human and spontaneous  
- Prefer light punctuation and at least one emoji per comment, but do not overuse them
- No hashtags  

### Comment Objectives
- Increase visibility and profile curiosity  
- Encourage profile clicks indirectly  
- Blend naturally into the comment section  

### Style Guidelines
- React to **specific visual details**, mood, or composition from the image(s)  
- Avoid generic phrases like “Nice pic”, “Love this”, “So cool”
- Do NOT mention following, liking, or engagement  
- Do NOT reference Leia, her page, or herself  

### Tone
- Casual, warm, aesthetically aware  
- Feels like a real person scrolling and reacting

### Length Rules
- Maximum: 20 words per comment  
- Preferably under 15 words  

### Variation Requirement
Each of the 4 comments must have a **distinct intent**:
1. Visual or aesthetic observation  
2. Curiosity or light question  
3. Mood or emotional reaction  
4. Personality-based or situational response  
        `,
        input: [
          {
            role: "user",
            content: [
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
