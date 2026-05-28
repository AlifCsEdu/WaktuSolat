/**
 * Safely sanitizes text input to prevent XSS (Cross-Site Scripting) attacks.
 * It strips out HTML tags and escapes potentially harmful characters.
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  
  // 1. Strip HTML tags completely
  let cleaned = input.replace(/<[^>]*>/g, "");
  
  // 2. Escape standard special HTML characters to neutral entities
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&grave;",
  };
  
  cleaned = cleaned.replace(/[&<>"'`\/]/g, (char) => escapeMap[char] || char);
  
  // 3. Remove characters commonly used in JavaScript URLs or execution contexts
  cleaned = cleaned.replace(/javascript:/gi, "");
  cleaned = cleaned.replace(/onload=/gi, "");
  cleaned = cleaned.replace(/onerror=/gi, "");
  
  return cleaned.trim();
}
