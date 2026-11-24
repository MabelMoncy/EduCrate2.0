/**
 * Content Sanitizer Utility
 *
 * Provides defense-in-depth sanitization functions across controllers and models
 * to prevent stored Cross-Site Scripting (XSS) and HTML injection.
 */

/**
 * Strip HTML tags from a string (defence-in-depth against stored XSS).
 * Iterates up to 10 passes to remove nested / overlapping tags like `<<script>script>`.
 * Bounded to 2000 chars to prevent regex denial of service.
 *
 * @param {unknown} str - Input value to sanitize
 * @returns {string} Sanitized string without HTML tags
 */
export const stripHtml = (str) => {
  if (typeof str !== 'string') return '';
  let sanitized = str.substring(0, 2000);
  let prev;
  let passes = 0;
  do {
    prev = sanitized;
    sanitized = sanitized.replace(/<[^><]*>/g, '');
    passes++;
  } while (sanitized !== prev && passes < 10);

  // If residual markup remains after reaching the pass limit, strip all remaining
  // '<' and '>' delimiters so no complete tag or event-handler can survive.
  if ((passes >= 10 && sanitized !== prev) || /<[^><]*>/.test(sanitized)) {
    sanitized = sanitized.replace(/[<>]/g, '');
  }

  return sanitized;
};

