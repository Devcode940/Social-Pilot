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


const aiScheduleSchema = z.object({
  platforms: z.array(z.string().trim().min(1).max(64)).min(1).max(5),
  content: z.string().trim().min(1).max(2000),
});

export const POST = tryCatch(async (request: NextRequest) => {
    const user = await requireUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const validation = await validateBody(request, aiScheduleSchema);
    if (!validation.success) return validation.response;
    const { platforms, content } = validation.data;

    const limiter = rateLimitByUser(request, user.id, { maxRequests: 20, windowSeconds: 3600 });
    if (!limiter.allowed) return rateLimitExceededResponse(limiter);

    const platformsStr = platforms.join(", ");

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a social media scheduling expert who analyzes content and recommends optimal posting times based on platform-specific engagement data and content type.

You must respond with ONLY valid JSON in this exact format (no markdown, no code fences, just raw JSON):
{
  "suggestedTimes": [
    {
      "day": "Monday",
      "time": "9:00 AM",
      "reason": "Brief explanation of why this time is optimal",
      "score": 92
    },
    {
      "day": "Wednesday",
      "time": "12:30 PM",
      "reason": "Brief explanation",
      "score": 87
    },
    {
      "day": "Friday",
      "time": "6:00 PM",
      "reason": "Brief explanation",
      "score": 83
    }
  ],
  "bestDay": "Monday",
  "bestTime": "9:00 AM"
}

Rules:
- Provide exactly 3 suggested posting times
- Score should be between 70-98 (confidence score)
- Times should be realistic and spread across different days
- Consider the content type and platforms when suggesting times
- Keep reasons concise (one sentence)
- Use full day names (Monday, Tuesday, etc.)
- Use 12-hour format with AM/PM`,
        },
        {
          role: "user",
          content: `Suggest optimal posting times for this content across these platforms: ${platformsStr}.\n\nContent: "${content.slice(0, 500)}"`,
        },
      ],
    });

    const rawText = completion.choices?.[0]?.message?.content?.trim() ?? "";

    // Try to parse JSON from the response
    let parsed;
    try {
      // Remove markdown code fences if present
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback suggestions if parsing fails
      parsed = {
        suggestedTimes: [
          {
            day: "Tuesday",
            time: "10:00 AM",
            reason: "Tuesday mornings see high engagement for most platforms",
            score: 88,
          },
          {
            day: "Thursday",
            time: "1:00 PM",
            reason: "Midweek lunch hours are peak browsing times",
            score: 84,
          },
          {
            day: "Saturday",
            time: "11:00 AM",
            reason: "Weekend mornings have relaxed, attentive audiences",
            score: 79,
          },
        ],
        bestDay: "Tuesday",
        bestTime: "10:00 AM",
      };
    }

    return NextResponse.json(parsed);
})
