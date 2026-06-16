"""
Browser screenshot capture for LinkedIn post images.
Uses Playwright (already installed via browser-use dependency) to take
topic-relevant screenshots from the web.

Usage:
    py -3.13 capture-image.py <search-topic> <output-path>
"""

import sys
import json
import asyncio
from urllib.parse import quote

# Topic → URL mapping for relevant screenshots
TOPIC_URLS = {
    # AI / ML
    "ai": "https://github.com/anomalyco/opencode",
    "artificial_intelligence": "https://en.wikipedia.org/wiki/Artificial_intelligence",
    "machine_learning": "https://en.wikipedia.org/wiki/Machine_learning",
    "deep_learning": "https://en.wikipedia.org/wiki/Deep_learning",
    "neural": "https://en.wikipedia.org/wiki/Neural_network",
    "llm": "https://en.wikipedia.org/wiki/Large_language_model",
    "gpt": "https://en.wikipedia.org/wiki/GPT-4",
    "claude": "https://www.anthropic.com",
    
    # Programming
    "python": "https://github.com/python/cpython",
    "typescript": "https://www.typescriptlang.org",
    "rust": "https://www.rust-lang.org",
    "react": "https://react.dev",
    "api": "https://en.wikipedia.org/wiki/API",
    "framework": "https://en.wikipedia.org/wiki/Software_framework",
    "coding": "https://github.com/anomalyco/opencode",
    "programming": "https://en.wikipedia.org/wiki/Computer_programming",
    "software": "https://en.wikipedia.org/wiki/Software_engineering",
    "engineering": "https://en.wikipedia.org/wiki/Software_engineering",
    "developer": "https://github.com/anomalyco/opencode",
    "tool": "https://en.wikipedia.org/wiki/Programming_tool",
    "github": "https://github.com/anomalyco/opencode",
    
    # DevOps / Cloud
    "devops": "https://en.wikipedia.org/wiki/DevOps",
    "cloud": "https://en.wikipedia.org/wiki/Cloud_computing",
    "kubernetes": "https://kubernetes.io",
    "docker": "https://www.docker.com",
    
    # Tech general
    "automation": "https://en.wikipedia.org/wiki/Automation",
    "security": "https://en.wikipedia.org/wiki/Computer_security",
    "data": "https://en.wikipedia.org/wiki/Data_science",
    "startup": "https://en.wikipedia.org/wiki/Startup_company",
    "tech": "https://en.wikipedia.org/wiki/Technology",
    "innovation": "https://en.wikipedia.org/wiki/Innovation",
    "productivity": "https://github.com/anomalyco/opencode",
    "open_source": "https://github.com/anomalyco/opencode",
    "linux": "https://en.wikipedia.org/wiki/Linux",
    
    # Fallback by day (overridden by specific topic match)
    "open-source": "https://github.com/anomalyco/opencode",
}

DEFAULT_URL = "https://github.com/anomalyco/opencode"


async def capture(topic, output_path):
    """Open browser, navigate to topic-relevant page, take screenshot."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print(json.dumps({"error": "playwright not installed. Run: py -3.13 -m playwright install chromium"}))
        sys.exit(1)

    # Find best URL for topic
    url = DEFAULT_URL
    topic_lower = topic.lower().replace("_", "_")
    for key, page_url in TOPIC_URLS.items():
        if key in topic_lower or topic_lower in key:
            url = page_url
            break

    print(json.dumps({"status": "navigating", "url": url, "topic": topic}))

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1200, "height": 800})
        
        try:
            await page.goto(url, timeout=15000, wait_until="networkidle")
        except Exception:
            # Timeout is OK — screenshot what we got
            pass
        
        await page.screenshot(path=output_path, full_page=False)
        await browser.close()

    print(json.dumps({"status": "captured", "path": output_path}))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: capture-image.py <topic> <output-path>"}))
        sys.exit(1)
    
    topic = sys.argv[1]
    output_path = sys.argv[2]
    asyncio.run(capture(topic, output_path))
