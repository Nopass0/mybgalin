/**
 * Parse user agent string to extract browser, OS, and device type.
 * Matches the logic from the Rust implementation.
 */
export function parseUserAgent(ua: string): {
  browser: string;
  os: string;
  device: string;
} {
  const uaLower = ua.toLowerCase();

  // Detect browser
  let browser = "Other";
  if (uaLower.includes("firefox")) {
    browser = "Firefox";
  } else if (uaLower.includes("edg/") || uaLower.includes("edge")) {
    browser = "Edge";
  } else if (uaLower.includes("chrome") && !uaLower.includes("chromium")) {
    browser = "Chrome";
  } else if (uaLower.includes("safari") && !uaLower.includes("chrome")) {
    browser = "Safari";
  } else if (uaLower.includes("opera") || uaLower.includes("opr/")) {
    browser = "Opera";
  }

  // Detect OS
  let os = "Other";
  if (uaLower.includes("windows")) {
    os = "Windows";
  } else if (uaLower.includes("mac os") || uaLower.includes("macos")) {
    os = "macOS";
  } else if (uaLower.includes("linux") && !uaLower.includes("android")) {
    os = "Linux";
  } else if (uaLower.includes("android")) {
    os = "Android";
  } else if (
    uaLower.includes("iphone") ||
    uaLower.includes("ipad") ||
    uaLower.includes("ios")
  ) {
    os = "iOS";
  }

  // Detect device type
  let device = "Desktop";
  if (
    uaLower.includes("mobile") ||
    (uaLower.includes("android") && !uaLower.includes("tablet")) ||
    uaLower.includes("iphone")
  ) {
    device = "Mobile";
  } else if (uaLower.includes("tablet") || uaLower.includes("ipad")) {
    device = "Tablet";
  }

  return { browser, os, device };
}

/**
 * Check if user agent is a known bot.
 */
export function isBot(ua: string): boolean {
  const uaLower = ua.toLowerCase();
  const botPatterns = [
    "bot",
    "crawler",
    "spider",
    "scraper",
    "curl",
    "wget",
    "python",
    "java/",
    "go-http",
    "axios",
    "node-fetch",
    "googlebot",
    "bingbot",
    "yandexbot",
    "facebookexternalhit",
    "twitterbot",
    "linkedinbot",
    "telegrambot",
    "whatsapp",
  ];

  return botPatterns.some((pattern) => uaLower.includes(pattern));
}
