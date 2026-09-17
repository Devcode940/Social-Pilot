import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";
import { requireUser } from "@/lib/auth-helpers";
import {
  tryCatch,
  validateBody,
  errorResponse,
  rateLimitByUser,
  rateLimitExceededResponse,
} from "@/lib/api-helpers";


const aiWriterSchema = z.object({
  topic: z.string().trim().min(1).max(500),
  contentType: z.string().trim().min(1).max(50),
  tone: z.string().trim().min(1).max(100),
  platforms: z.array(z.string().trim().min(1).max(64)).min(1).max(5),
  options: z
    .object({
      audience: z.string().trim().max(200).optional(),
      includeEmojis: z.boolean().optional(),
      includeHashtags: z.boolean().optional(),
      includeCTA: z.boolean().optional(),
      length: z.string().trim().max(32).optional(),
      language: z.string().trim().max(64).optional(),
    })
    .optional(),
});

export const POST = tryCatch(async (request: NextRequest) => {
    const user = await requireUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const validation = await validateBody(request, aiWriterSchema);
    if (!validation.success) return validation.response;
    const { topic, contentType, tone, platforms, options = {} } = validation.data;

    const {
      audience = "general",
      includeEmojis = true,
      includeHashtags = true,
      includeCTA = true,
      length = "medium",
      language = "English",
    } = options;

    const limiter = rateLimitByUser(request, user.id, { maxRequests: 20, windowSeconds: 3600 });
    if (!limiter.allowed) return rateLimitExceededResponse(limiter);

    const platformsStr = platforms.join(", ");

    const systemPrompt = `You are a world-class social media content expert and copywriter. You create engaging, high-performing content that drives engagement and growth.

Your task is to generate exactly 3 unique variations of social media content based on the user's request.

Content parameters:
- Topic: ${topic}
- Content Type: ${contentType} (e.g., post, caption, tweet, story, thread, ad copy)
- Tone: ${tone}
- Target Platforms: ${platformsStr}
- Target Audience: ${audience}
- Length: ${length}
- Language: ${language}
- Include Emojis: ${includeEmojis ? "Yes" : "No"}
- Include Hashtags: ${includeHashtags ? "Yes" : "No"}
- Include Call-to-Action: ${includeCTA ? "Yes" : "No"}

CRITICAL FORMATTING RULES:
1. Generate exactly 3 distinct variations.
2. Separate each variation with exactly this delimiter on its own line: ---VARIATION---
3. Each variation should have a different angle, hook, or approach while staying on topic.
4. Do NOT include any labels like "Variation 1:" or "Option A:" - start directly with the content.
5. Make each variation optimized for the specified platforms.
6. Ensure proper use of line breaks and formatting for social media readability.`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Write 3 social media ${contentType} variations about: "${topic}". Tone: ${tone}. Platforms: ${platformsStr}.`,
        },
      ],
    });

    const aiText: string = completion.choices?.[0]?.message?.content ?? "";

    // Parse the response into 3 variations using the delimiter
    const rawVariations = aiText
      .split("---VARIATION---")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    let variations: { text: string; wordCount: number; charCount: number }[];

    if (rawVariations.length >= 2) {
      variations = rawVariations.slice(0, 3).map((text) => ({
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        charCount: text.length,
      }));
    } else {
      // Fallback: split by double newlines if delimiter wasn't used
      const fallbackVariations = aiText
        .split(/\n\s*\n/)
        .map((v) => v.trim())
        .filter((v) => v.length > 10);

      if (fallbackVariations.length >= 2) {
        variations = fallbackVariations.slice(0, 3).map((text) => ({
          text,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          charCount: text.length,
        }));
      } else {
        // Last resort: return the whole text as a single variation
        variations = [
          {
            text: aiText.trim(),
            wordCount: aiText.trim().split(/\s+/).filter(Boolean).length,
            charCount: aiText.trim().length,
          },
        ];
      }
    }

    return NextResponse.json({ variations });
})
