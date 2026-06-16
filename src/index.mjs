/**
 * LinkedIn Daily Post Automation — Entry Point
 *
 * Usage:
 *   LINKEDIN_ACCESS_TOKEN=xxx LINKEDIN_PERSON_URN=urn:li:person:xxx node src/index.mjs
 *
 * In GitHub Actions, set those as secrets. The workflow calls this script.
 */

import { createPost } from "./linkedin-client.mjs";
import { generateDailyPost } from "./content.mjs";

async function main() {
  const mode = process.argv[2] || "post";

  switch (mode) {
    case "preview":
      // Generate and print the post without posting
      const preview = await generateDailyPost();
      console.log("=== POST PREVIEW ===");
      console.log(preview);
      console.log("=== END ===");
      break;

    case "post":
    default:
      console.log("[linkedin-automation] Generating daily post...");
      const post = await generateDailyPost();

      console.log("[linkedin-automation] Posting to LinkedIn...");
      const result = await createPost(post);

      console.log("[linkedin-automation] ✅ Posted successfully!");
      console.log(`Response: ${JSON.stringify(result, null, 2)}`);
      break;
  }
}

main().catch(err => {
  console.error("[linkedin-automation] ❌ Failed:", err.message);
  process.exit(1);
});
