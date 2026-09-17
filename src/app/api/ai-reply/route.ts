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


const aiReplySchema = z.object({
  commentId: z.string().min(1).max(64).optional(),
  commentContent: z.string().trim().min(1).max(2000),
  tone: z.string().trim().min(1).max(100).optional(),
});

export const POST = tryCatch(async (request: NextRequest) => {
    const user = await requireUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const validation = await validateBody(request, aiReplySchema);
    if (!validation.success) return validation.response;
    const { commentContent, tone = "professional and friendly" } = validation.data;

    const limiter = rateLimitByUser(request, user.id, { maxRequests: 30, windowSeconds: 3600 });
    if (!limiter.allowed) return rateLimitExceededResponse(limiter);

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a social media community manager who writes excellent, concise replies to comments. Your tone is ${tone}.

Rules:
- Keep the reply concise (1-3 sentences max)
- Match the sentiment of the original comment
- If the comment is a question, answer it helpfully
- If the comment is negative, be empathetic and professional
- If the comment is positive, show gratitude
- Do NOT use hashtags unless the original comment used them
- Do NOT include quotation marks around your reply
- Write ONLY the reply text, nothing else`,
        },
        {
          role: "user",
          content: `Write a reply to this social media comment: "${commentContent}"`,
        },
      ],
    });

    const suggestedReply =
      completion.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ suggestedReply });
})
