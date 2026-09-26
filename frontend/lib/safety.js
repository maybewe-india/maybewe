// In-Chat Safety Scanner
// Detects phone numbers, social media handles, email addresses, and external communication links

export const SAFETY_PATTERNS = {
  // Matches phone numbers formatted with digits, dashes, spaces, parentheses (7+ digits)
  phone: /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?|\b\d{10,12}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
  
  // Matches social handles like @username, insta: username, ig: username, snap: username, whatsapp: ...
  social: /(?:@\w{3,30}|(?:insta(?:gram)?|ig|snap(?:chat)?|whatsapp|telegram|tg|wechat)\s*[:\-]?\s*@?[\w._-]{3,30})/i,
  
  // Matches standard email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  
  // Matches social domain links (instagram.com, t.me, wa.me, etc.)
  externalLinks: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|ig\.me|t\.me|telegram\.me|wa\.me|api\.whatsapp\.com|snapchat\.com|facebook\.com|fb\.com)\/[A-Za-z0-9_.-]+/i,
};

/**
 * Scans a message text and returns safety analysis
 * @param {string} text 
 * @returns {{ containsSensitiveInfo: boolean, reason: string | null, matches: string[] }}
 */
export function scanMessageForSafety(text) {
  if (!text || typeof text !== 'string') {
    return { containsSensitiveInfo: false, reason: null, matches: [] };
  }

  const matches = [];
  let reason = null;

  if (SAFETY_PATTERNS.phone.test(text)) {
    matches.push('phone');
    reason = 'Phone number detected';
  }

  if (SAFETY_PATTERNS.social.test(text)) {
    matches.push('social');
    reason = reason ? `${reason}, social media handle` : 'Social media handle detected';
  }

  if (SAFETY_PATTERNS.email.test(text)) {
    matches.push('email');
    reason = reason ? `${reason}, email address` : 'Email address detected';
  }

  if (SAFETY_PATTERNS.externalLinks.test(text)) {
    matches.push('external_link');
    reason = reason ? `${reason}, external contact link` : 'External link detected';
  }

  return {
    containsSensitiveInfo: matches.length > 0,
    reason,
    matches,
    warningMessage: 'Stay safe: avoid sharing personal contact information too early. Get to know each other on MaybeWe first.',
  };
}

export default {
  scanMessageForSafety,
  SAFETY_PATTERNS,
};
