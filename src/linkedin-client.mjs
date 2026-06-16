/**
 * Direct LinkedIn REST API client — no OAuth flow needed.
 * Uses a pre-obtained access token stored as env var.
 */

const API_BASE = "https://api.linkedin.com";
const API_VERSION = "202602";

function getToken() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) throw new Error("LINKEDIN_ACCESS_TOKEN env var is required");
  return token;
}

function getHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": API_VERSION,
    "Content-Type": "application/json",
  };
}

/**
 * Make an authenticated request to LinkedIn REST API.
 */
async function api(method, path, body) {
  const url = `${API_BASE}${path}`;
  const opts = { method, headers: getHeaders() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    throw new Error(`LinkedIn API ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Create a text post on the user's LinkedIn feed.
 * Uses the Posts API (v2) — not the legacy UGC API.
 * @param {string} text - Post body
 * @param {string} [imageUrn] - Optional image URN for native photo posts
 * @returns {Promise<object>}
 */
export async function createPost(text, imageUrn) {
  const author = process.env.LINKEDIN_PERSON_URN;
  if (!author) throw new Error("LINKEDIN_PERSON_URN env var is required");

  const body = {
    author,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
  };

  if (imageUrn) {
    body.content = {
      media: {
        id: imageUrn,
        altText: "AI & Tech Update",
      },
    };
  }

  return api("POST", "/rest/posts", body);
}

/**
 * Upload an image to LinkedIn. Returns the image URN.
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} mimeType - e.g. "image/png"
 * @returns {Promise<string>} image URN
 */
export async function uploadImage(imageBuffer, mimeType) {
  const author = process.env.LINKEDIN_PERSON_URN;
  if (!author) throw new Error("LINKEDIN_PERSON_URN env var is required");

  // Step 1: Register upload
  const registerRes = await api("POST", "/rest/images?action=initializeUpload", {
    initializeUploadRequest: { owner: author },
  });

  const uploadUrl = registerRes.value.uploadUrl;
  const imageUrn = registerRes.value.image;

  // Step 2: Upload binary
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": mimeType,
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`Image upload failed: ${uploadRes.status}`);
  }

  return imageUrn;
}
