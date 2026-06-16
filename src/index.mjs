/**
 * LinkedIn Daily Post Automation — Entry Point
 *
 * Usage:
 *   LINKEDIN_ACCESS_TOKEN=xxx LINKEDIN_PERSON_URN=urn:li:person:xxx node src/index.mjs post
 *   LINKEDIN_ACCESS_TOKEN=xxx LINKEDIN_PERSON_URN=urn:li:person:xxx node src/index.mjs preview
 *
 * In GitHub Actions, set those as secrets. The workflow calls this script.
 */

import { createPost, uploadImage } from "./linkedin-client.mjs";
import { generateDailyPost, getTodaysImage } from "./content.mjs";

async function main() {
  const mode = process.argv[2] || "post";

  switch (mode) {
    case "preview": {
      // Generate and print the post without posting
      const { post: preview } = await generateDailyPost();
      console.log("=== POST PREVIEW ===");
      console.log(preview);
      console.log("=== END ===");
      break;
    }

    case "post":
    default: {
      // Step 1: Generate post content + fetch HN stories for image matching
      console.log("[linkedin-automation] Generating daily post...");
      const { post, stories } = await generateDailyPost();

      // Step 2: Get today's dynamic image (topic-matched from stories/theme)
      console.log("[linkedin-automation] Fetching topic-relevant image...");
      const { buffer, mimeType } = await getTodaysImage(stories);
      const imageUrn = await uploadImage(buffer, mimeType);
      console.log(`[linkedin-automation] Image uploaded: ${imageUrn}`);

      // Step 3: Create post with image
      console.log("[linkedin-automation] Posting to LinkedIn with image...");
      const result = await createPost(post, imageUrn);

      console.log("[linkedin-automation] ✅ Posted successfully!");
      console.log(`Response: ${JSON.stringify(result, null, 2)}`);
      break;
    }
  }
}

main().catch(err => {
  console.error(`[linkedin-automation] ❌ Failed: ${err.message}`);
  process.exit(1);
});
