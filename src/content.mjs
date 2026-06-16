/**
 * Content generator for daily LinkedIn posts.
 * Fetches trending AI/tech stories from Hacker News and composes posts.
 * No API key needed — uses Hacker News Firebase API (free).
 */

import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const HN_TOP = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM = "https://hacker-news.firebaseio.com/v0/item";

// Free-to-use AI/tech images from Unsplash, rotated by day of week
// Each is a direct Unsplash image URL (free for commercial use via Unsplash license)
const IMAGE_URLS = [
  // Mon — OpenCode GitHub repo social preview
  "https://repository-images.githubusercontent.com/975734319/2c2c3389-c647-405c-a499-f80e4d521277",
  // Tue — AI brain/neural network
  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200",
  // Wed — Developer coding
  "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200",
  // Thu — OpenCode again
  "https://repository-images.githubusercontent.com/975734319/2c2c3389-c647-405c-a499-f80e4d521277",
  // Fri — AI brain
  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200",
  // Sat — Developer coding
  "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200",
  // Sun — OpenCode
  "https://repository-images.githubusercontent.com/975734319/2c2c3389-c647-405c-a499-f80e4d521277",
];

// Tech/AI-related keywords to filter stories
const RELEVANT_KEYWORDS = [
  "ai", "artificial intelligence", "machine learning", "llm", "gpt",
  "claude", "open source", "developer", "coding", "programming",
  "software", "engineering", "startup", "tech", "github",
  "productivity", "agent", "automation", "cloud", "security",
  "data", "neural", "deep learning", "framework", "tool",
  "react", "typescript", "python", "rust", "go lang",
  "devops", "api", "kubernetes", "docker",
];

/**
 * Fetch a Hacker News item by ID.
 */
async function fetchItem(id) {
  const res = await fetch(`${HN_ITEM}/${id}.json`);
  return res.json();
}

/**
 * Get top HN stories, filter to AI/tech, return top matches.
 * @param {number} count - How many matching stories to return
 */
async function fetchRelevantStories(count = 3) {
  const res = await fetch(HN_TOP);
  const ids = await res.json();

  // Fetch top 50 stories and filter
  const top50 = ids.slice(0, 50);
  const items = await Promise.all(top50.map(fetchItem));

  const relevant = items.filter(item => {
    if (!item || !item.title || item.type !== "story") return false;
    const title = item.title.toLowerCase();
    return RELEVANT_KEYWORDS.some(kw => title.includes(kw));
  });

  return relevant.slice(0, count);
}

/**
 * Pick a post template and fill it with today's news.
 */
function composePost(stories, dayOfWeek) {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  // Rotate through content themes by day of week
  const themes = [
    "tools",      // Monday — dev tools
    "problems",   // Tuesday — problem/solution
    "news",       // Wednesday — AI news roundup
    "workflow",   // Thursday — workflow/productivity
    "reflection", // Friday — weekly reflection
    "deep-dive",  // Saturday — deep dive
    "open-source",// Sunday — open source spotlight
  ];
  const theme = themes[dayOfWeek];

  // Build story references
  const storyLines = stories.map((s, i) => {
    const url = s.url ? ` ${s.url}` : "";
    return `${i + 1}. "${s.title}"${url} (${s.score} points)`;
  }).join("\n");

  const storySection = stories.length > 0
    ? `\nToday's notable discussions:\n${storyLines}\n`
    : "";

  const templates = {
    "tools": {
      intro: [
        "The best dev tools solve real pain points — here's what caught my eye this week.",
        "Every week, a new tool promises to change how we code. Here's what's worth your time.",
      ],
      body: [
        `The open-source ecosystem keeps delivering. OpenCode (github.com/anomalyco/opencode) continues to push what's possible with AI coding agents — parallel subagents, per-agent model config, and markdown-based agent definitions that make customization dead simple.`,
        `The trend is clear: specialized agents > monolithic AI. Instead of one model doing everything, we're seeing a shift toward swarms of focused agents that each handle one thing well.`,
      ],
      outro: [
        `What tools have you added to your stack recently? Always looking for recommendations.`,
      ],
    },
    "problems": {
      intro: [
        "Real engineering isn't about writing code — it's about solving the right problems. Here's a breakdown.",
        "The tech industry loves solutions in search of problems. Let's look at actual problems worth solving.",
      ],
      body: [
        `Problem: Context overload in AI-assisted development. When you feed an LLM your entire codebase, tokens explode and focus dilutes.`,
        `Solution: Agent-based architecture with scoped contexts. OpenCode's subagent system tackles exactly this — each agent loads only what it needs. The Explore agent reads code. The Scout agent checks deps. The Build agent implements. No single agent sees everything, but the system as a whole does.`,
        `This pattern — divide and conquer with specialized AI agents — is emerging as the standard for scalable AI development workflows.`,
      ],
      outro: [
        `What's the biggest tech problem you're trying to solve right now? Curious how others are tackling it.`,
      ],
    },
    "news": {
      intro: [
        "AI moves fast. Here's what happened in tech this week that you might have missed.",
        "The AI landscape shifts daily. Here's my curated roundup of the week's most important stories.",
      ],
      body: [
        `The AI agent space is heating up. Open-source coding agents like OpenCode are proving that you don't need a proprietary platform to get parallel agent workflows, custom tool permissions, and multi-model setups.`,
        `The shift toward agentic workflows — where AI doesn't just chat but acts — is the biggest trend in developer tooling right now.`,
      ],
      outro: [
        `What AI news caught your attention this week? Always keen to hear different perspectives.`,
      ],
    },
    "workflow": {
      intro: [
        "Your development workflow is your most important code. Here's how I optimize mine.",
        "Speed in software development isn't about typing faster — it's about reducing feedback loops.",
      ],
      body: [
        `Current workflow: OpenCode with parallel subagents. When I start a task, the Build agent handles implementation while the Explore agent researches patterns and the General agent runs multi-step subtasks. All in parallel, all scoped to their specific context.`,
        `The result: 3-4x throughput without sacrificing quality. Each agent stays focused, token usage stays efficient, and I stay in the architect/review loop instead of the implementation weeds.`,
      ],
      outro: [
        `What's one change to your workflow that made the biggest difference? I'm always iterating.`,
      ],
    },
    "reflection": {
      intro: [
        "End of week reflections on building software with AI in 2026.",
        "A week of shipping. Here's what I learned about AI-assisted development.",
      ],
      body: [
        `The biggest lesson this week: AI agents are only as good as their boundaries. When you scope an agent's context, tools, and permissions correctly, it outperforms an unrestricted model every time.`,
        `OpenCode's permission system (allow/deny/ask per tool) turns this from theory into practice. The Plan agent can analyze but never modify. The Build agent has full access. Each knows its role.`,
      ],
      outro: [
        `Best thing I learned this week: specialized beats general every time. More agents, less monolith.`,
      ],
    },
    "deep-dive": {
      intro: [
        "Let's go deep on one topic: how AI coding agents actually work under the hood.",
        "Weekend deep dive — understanding the architecture behind AI-assisted development.",
      ],
      body: [
        `The architecture behind OpenCode's agent system is elegant: each agent is defined in a markdown file with frontmatter (model, permissions, temperature, description) and a system prompt. That's it. No complex framework, no DSL.`,
        `When a subagent is invoked via @mention, it gets its own session with its own context window, tool set, and model. The primary agent routes tasks based on descriptions. This is closer to how human teams work than any monolithic AI system.`,
        `Key insight: the agent description field is critical — it's how the system knows when to delegate. Write good descriptions, and the routing becomes invisible.`,
      ],
      outro: [
        `Want me to go deeper on any specific aspect of agent architecture? Happy to break it down.`,
      ],
    },
    "open-source": {
      intro: [
        "Open source is eating software — again. Here's what's worth your attention this week.",
        "The open source community keeps shipping. Here are the projects I'm watching.",
      ],
      body: [
        `OpenCode (github.com/anomalyco/opencode) is the open-source coding agent that's redefining AI-assisted development. 99k+ stars, active development, and a plugin ecosystem that keeps growing.`,
        `What makes it different: full transparency. You can see exactly how your agent is configured, what permissions it has, and what model it's using. No black boxes.`,
        `The open-source agent ecosystem means you can build custom subagents for your specific stack — database agents, frontend agents, devops agents — all within the same framework.`,
      ],
      outro: [
        `What open-source projects are you excited about? Drop your recommendations below.`,
      ],
    },
  };

  const t = templates[theme];
  const intro = t.intro[Math.floor(Math.random() * t.intro.length)];

  const post = [
    `${intro}\n`,
    t.body.join("\n\n"),
    storySection,
    t.outro[Math.floor(Math.random() * t.outro.length)],
    `\n#OpenCode #AIAgents #DeveloperProductivity #OpenSource #Tech`,
  ].filter(Boolean).join("\n");

  return post;
}

/**
 * Generate today's LinkedIn post content.
 * @returns {Promise<string>}
 */
export async function generateDailyPost() {
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...
  const stories = await fetchRelevantStories(2);
  return composePost(stories, dayOfWeek);
}

/**
 * Get today's image from the web — downloaded at runtime.
 * Returns { buffer, mimeType, cleanup } for uploading to LinkedIn.
 * Images are sourced from free Unsplash URLs, rotated by day of week.
 * Call cleanup() to delete the temp file after upload.
 */
export async function getTodaysImage() {
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...
  const url = IMAGE_URLS[dayOfWeek];

  console.log(`[linkedin-automation] Downloading image from: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());

  // Detect MIME type from URL extension or Content-Type header
  const contentType = res.headers.get("content-type") || "";
  const mimeType = contentType.startsWith("image/")
    ? contentType
    : url.endsWith(".png") ? "image/png" : "image/jpeg";

  console.log(`[linkedin-automation] Image downloaded: ${(buffer.length / 1024).toFixed(0)} KB (${mimeType})`);

  return { buffer, mimeType };
}
