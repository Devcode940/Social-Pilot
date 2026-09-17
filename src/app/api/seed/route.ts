import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { tryCatch, errorResponse } from "@/lib/api-helpers";

// Demo credentials for the seeded account (development only).
export const DEMO_EMAIL = "demo@socialtool.com";
export const DEMO_PASSWORD = "Demo1234!";

const daysAgo = (days: number, hours = 0) =>
  new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);

// POST /api/seed — create demo data.
// Public ONLY for first-run bootstrap (zero users in the DB); afterwards a
// login is required. Idempotent: returns early when the demo user exists.
export const POST = tryCatch(async () => {
  const userCount = await db.user.count();
  if (userCount > 0) {
    const caller = await requireUser();
    if (!caller) return errorResponse("Unauthorized", 401);
  }

  const existingUser = await db.user.findUnique({
    where: { email: DEMO_EMAIL },
  });
  if (existingUser) {
    return NextResponse.json({
      success: true,
      message: "Seed data already exists",
    });
  }

  // Create the demo user (with a documented dev password so it can log in)
  const user = await db.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      password: await bcrypt.hash(DEMO_PASSWORD, 12),
      bio: "Social media enthusiast | Content creator | Growth hacker",
      timezone: "America/New_York",
    },
  });

  // Create 6 SocialAccounts
  const accounts = await Promise.all([
    db.socialAccount.create({
      data: {
        userId: user.id,
        platform: "instagram",
        username: "demo_instagram",
        displayName: "Demo Instagram",
        followers: 125400,
        following: 890,
      },
    }),
    db.socialAccount.create({
      data: {
        userId: user.id,
        platform: "twitter",
        username: "demo_twitter",
        displayName: "Demo Twitter",
        followers: 83200,
        following: 1240,
      },
    }),
    db.socialAccount.create({
      data: {
        userId: user.id,
        platform: "facebook",
        username: "demo_facebook",
        displayName: "Demo Facebook",
        followers: 45600,
        following: 320,
      },
    }),
    db.socialAccount.create({
      data: {
        userId: user.id,
        platform: "tiktok",
        username: "demo_tiktok",
        displayName: "Demo TikTok",
        followers: 312000,
        following: 450,
      },
    }),
    db.socialAccount.create({
      data: {
        userId: user.id,
        platform: "youtube",
        username: "demo_youtube",
        displayName: "Demo YouTube",
        followers: 27800,
        following: 180,
      },
    }),
    db.socialAccount.create({
      data: {
        userId: user.id,
        platform: "linkedin",
        username: "demo_linkedin",
        displayName: "Demo LinkedIn",
        followers: 15400,
        following: 560,
      },
    }),
  ]);

  // Create sample posts (dates relative to today so stats/periods look alive)
  const postsData = [
    { userId: user.id, accountId: accounts[0].id, platforms: "instagram", content: "Want to boost your Instagram engagement? Here are 5 proven strategies that helped us grow by 300% in just 3 months! 📈 #SocialMedia #GrowthTips", status: "published", likes: 1247, comments: 89, shares: 203, views: 15400, publishedAt: daysAgo(9) },
    { userId: user.id, accountId: accounts[1].id, platforms: "twitter", content: "Thread: The ultimate guide to Twitter/X marketing in 2026. From algorithm changes to content strategies — everything you need to know. 🧵👇", status: "published", likes: 562, comments: 134, shares: 421, views: 28900, publishedAt: daysAgo(6) },
    { userId: user.id, accountId: accounts[2].id, platforms: "facebook", content: "Join our free webinar this Friday: 'Facebook Ads Mastery — From Zero to Hero'. Limited spots available!", status: "scheduled", scheduledAt: new Date(Date.now() + 3 * 86_400_000) },
    { userId: user.id, accountId: accounts[3].id, platforms: "tiktok", content: "POV: You just discovered the power of TikTok trends for your brand 🎬", status: "published", likes: 8934, comments: 567, shares: 2100, views: 245000, publishedAt: daysAgo(4) },
    { userId: user.id, accountId: accounts[4].id, platforms: "youtube", content: "How I grew my YouTube channel from 0 to 25K subscribers using only organic strategies.", status: "published", likes: 1876, comments: 234, shares: 156, views: 89000, publishedAt: daysAgo(2) },
    { userId: user.id, accountId: accounts[5].id, platforms: "linkedin", content: "After managing social media for 50+ brands, here's the one thing that separates successful campaigns from the rest: Consistency.", status: "published", likes: 423, comments: 78, shares: 156, views: 12300, publishedAt: daysAgo(1) },
  ];

  const posts: { id: string }[] = [];
  for (const postData of postsData) {
    const post = await db.post.create({ data: postData });
    posts.push(post);
  }

  // Create sample comments
  const commentsData = [
    { postId: posts[0].id, author: "Sarah Mitchell", content: "These tips are gold! Implemented #3 and already seeing results.", platform: "instagram", isRead: true, isReplied: true, reply: "So glad to hear that, Sarah! Keep us posted." },
    { postId: posts[0].id, author: "Mike Chen", content: "Can you do a follow-up on hashtag strategy?", platform: "instagram", isRead: false },
    { postId: posts[1].id, author: "Alex Rivera", content: "This thread is incredibly comprehensive. Bookmarked!", platform: "twitter", isRead: true, isReplied: true },
    { postId: posts[3].id, author: "Emily Watson", content: "OMG this went viral!! The editing is chef's kiss!", platform: "tiktok", isRead: true, isReplied: true },
    { postId: posts[4].id, author: "Robert Kim", content: "Best YouTube growth video I've seen all year.", platform: "youtube", isRead: false },
  ];

  await Promise.all(commentsData.map((c) => db.comment.create({ data: c })));

  // Create campaigns
  await Promise.all([
    db.campaign.create({ data: { userId: user.id, name: "Instagram Growth Boost", type: "like", platforms: "instagram", targetCount: 500, currentCount: 342, status: "active" } }),
    db.campaign.create({ data: { userId: user.id, name: "Twitter Engagement Push", type: "comment", platforms: "twitter", targetCount: 200, currentCount: 89, status: "active" } }),
    db.campaign.create({ data: { userId: user.id, name: "LinkedIn Authority Builder", type: "like", platforms: "linkedin", targetCount: 300, currentCount: 300, status: "completed", endedAt: daysAgo(1) } }),
  ]);

  // Create UserSettings
  await db.userSettings.create({
    data: {
      userId: user.id,
      emailNotifications: true,
      pushNotifications: true,
      postPublishedNotify: true,
      commentAlerts: true,
      campaignCompletion: true,
      weeklyAnalyticsDigest: true,
      trendAlerts: false,
      theme: "system",
      compactMode: false,
      sidebarDefaultExpanded: true,
    },
  });

  // Create Notifications
  const now = Date.now();
  await Promise.all([
    db.notification.create({ data: { userId: user.id, type: "post", title: "Post Published", message: "Your Instagram post was published successfully.", read: true, createdAt: new Date(now - 3600000 * 2) } }),
    db.notification.create({ data: { userId: user.id, type: "comment", title: "New Comment", message: "Sarah Mitchell commented: 'These tips are gold!'", read: false, createdAt: new Date(now - 3600000) } }),
    db.notification.create({ data: { userId: user.id, type: "campaign", title: "Campaign Completed", message: "LinkedIn Authority Builder reached its target of 300 likes.", read: false, createdAt: new Date(now - 1800000) } }),
    db.notification.create({ data: { userId: user.id, type: "trend", title: "Trending Topic Alert", message: "'AI Marketing' is trending on Twitter/X with 74K+ mentions.", read: false, createdAt: new Date(now - 900000) } }),
    db.notification.create({ data: { userId: user.id, type: "system", title: "Welcome to SocialPilot!", message: "Get started by connecting your social media accounts.", read: true, createdAt: new Date(now - 86400000) } }),
    db.notification.create({ data: { userId: user.id, type: "comment", title: "New Comment", message: "Emily Watson commented on your TikTok: 'OMG this went viral!!'", read: false, createdAt: new Date(now - 600000) } }),
    db.notification.create({ data: { userId: user.id, type: "post", title: "Post Scheduled", message: "Your Facebook post has been scheduled.", read: true, createdAt: new Date(now - 7200000) } }),
  ]);

  // Create sample API key
  await db.apiKey.create({
    data: {
      userId: user.id,
      label: "Development Key",
      key: "sp_dev_" + crypto.randomUUID().replace(/-/g, ""),
    },
  });

  return NextResponse.json({
    success: true,
    message: "Seed data created",
    demo: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
});
