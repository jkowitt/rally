// Username content moderation service for Rally
// Checks handles for profanity, slurs, explicit content, and inappropriate language.
// Uses a multi-layer approach: exact blocklist, pattern matching, and leet-speak decoding.

// ==============================
// BLOCKED WORD LISTS
// ==============================

// Explicit profanity and slurs (exact matches and substrings)
const BLOCKED_EXACT: string[] = [
  // Profanity
  'fuck', 'shit', 'ass', 'damn', 'bitch', 'bastard', 'dick', 'cock', 'pussy',
  'cunt', 'twat', 'piss', 'crap', 'hell', 'slut', 'whore', 'hoe',
  'tits', 'boob', 'porn', 'nude', 'naked', 'penis', 'vagina', 'anus',
  'fag', 'faggot', 'dyke', 'tranny', 'retard', 'retarded',
  // Racial slurs
  'nigger', 'nigga', 'negro', 'chink', 'gook', 'spic', 'kike', 'wetback',
  'cracker', 'honky', 'beaner', 'coon', 'darkie', 'jap', 'paki',
  'raghead', 'towelhead', 'zipperhead', 'wop', 'dago',
  // Sexual explicit
  'blowjob', 'handjob', 'rimjob', 'cumshot', 'creampie', 'gangbang',
  'dildo', 'vibrator', 'orgasm', 'erection', 'ejaculate',
  'anal', 'oral', 'fellatio', 'cunnilingus', 'masturbat',
  'threesome', 'foursome', 'orgy', 'bondage', 'fetish',
  'hentai', 'milf', 'gilf', 'bdsm', 'dominatrix',
  // Drugs
  'cocaine', 'heroin', 'meth', 'crack', 'ecstasy',
  // Violence/hate
  'kill', 'murder', 'rape', 'molest', 'terrorist', 'nazi', 'hitler',
  'kkk', 'genocide', 'holocaust',
  // Other inappropriate
  'onlyfans', 'chaturbate', 'pornhub', 'xvideos', 'brazzers',
  'escort', 'hooker', 'pimp', 'pedophile', 'pedo',
];

// Substrings that should be flagged even when embedded in longer words
const BLOCKED_SUBSTRINGS: string[] = [
  'fuck', 'shit', 'nigg', 'fag', 'cunt', 'twat', 'slut', 'whore',
  'dick', 'cock', 'porn', 'nude', 'pussy', 'pedo', 'rape',
  'nazi', 'kkk',
];

// Common leet-speak substitutions
const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
  '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i',
  '+': 't', '|': 'l',
};

// ==============================
// MODERATION FUNCTIONS
// ==============================

// Decode leet-speak to plain text
function decodeLeet(input: string): string {
  return input.split('').map(c => LEET_MAP[c] || c).join('');
}

// Normalize a handle for checking: lowercase, strip special chars, decode leet
function normalizeHandle(handle: string): string[] {
  const clean = handle.replace(/^@/, '').toLowerCase();

  // Generate variants: original, no-underscores, no-numbers, leet-decoded
  const noSpecial = clean.replace(/[_\-\.]/g, '');
  const noNumbers = clean.replace(/[0-9]/g, '');
  const leetDecoded = decodeLeet(clean);
  const leetNoSpecial = decodeLeet(noSpecial);

  return [clean, noSpecial, noNumbers, leetDecoded, leetNoSpecial];
}

// Check if a handle is inappropriate
export function checkHandle(handle: string): {
  isClean: boolean;
  reason: string | null;
  matchedWord: string | null;
} {
  const variants = normalizeHandle(handle);

  // Check exact matches
  for (const variant of variants) {
    for (const blocked of BLOCKED_EXACT) {
      if (variant === blocked) {
        return { isClean: false, reason: 'inappropriate language', matchedWord: blocked };
      }
    }
  }

  // Check substring matches
  for (const variant of variants) {
    for (const blocked of BLOCKED_SUBSTRINGS) {
      if (variant.includes(blocked)) {
        return { isClean: false, reason: 'inappropriate language', matchedWord: blocked };
      }
    }
  }

  // Check for repeated offensive patterns (e.g., "aassss", "fuuuck")
  for (const variant of variants) {
    // Collapse repeated chars: "fuuuck" -> "fuck"
    const collapsed = variant.replace(/(.)\1+/g, '$1');
    for (const blocked of BLOCKED_SUBSTRINGS) {
      if (collapsed.includes(blocked)) {
        return { isClean: false, reason: 'inappropriate language', matchedWord: blocked };
      }
    }
  }

  return { isClean: true, reason: null, matchedWord: null };
}

// Generate a safe default handle from user's name
// Format: first initial + first 4 letters of last name + 123
export function generateSafeHandle(name: string): string {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || 'user';
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

  const initial = firstName.charAt(0).toLowerCase();
  const lastPart = lastName
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 4)
    .toLowerCase();

  if (lastPart.length > 0) {
    return `@${initial}${lastPart}123`;
  }

  // Fallback if no last name
  const firstPart = firstName
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 5)
    .toLowerCase();
  return `@${firstPart}123`;
}

// Validate handle moderation result and return the appropriate API response data
export interface HandleCheckResult {
  allowed: boolean;
  warning: boolean;        // true if this is a warning (not yet forced)
  warningNumber: number;   // 1 or 2 (which warning this is)
  forced: boolean;         // true if handle was force-assigned
  forcedHandle: string | null;  // the auto-assigned handle if forced
  lockedUntil: string | null;   // ISO timestamp when handle can be changed
  message: string;
}

export function evaluateHandleAttempt(
  handle: string,
  name: string,
  currentWarnings: number,
): HandleCheckResult {
  const check = checkHandle(handle);

  if (check.isClean) {
    return {
      allowed: true,
      warning: false,
      warningNumber: 0,
      forced: false,
      forcedHandle: null,
      lockedUntil: null,
      message: 'Handle is acceptable',
    };
  }

  const newWarningCount = currentWarnings + 1;

  if (newWarningCount <= 2) {
    // Warning: let them try again
    return {
      allowed: false,
      warning: true,
      warningNumber: newWarningCount,
      forced: false,
      forcedHandle: null,
      lockedUntil: null,
      message: newWarningCount === 1
        ? 'That username contains inappropriate content. Please choose a different handle. This is warning 1 of 2.'
        : 'That username contains inappropriate content. This is your final warning. One more attempt with inappropriate language and your handle will be automatically assigned.',
    };
  }

  // 3rd violation: force-assign a safe handle, lock for 72 hours
  const safeHandle = generateSafeHandle(name);
  const lockUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);

  return {
    allowed: false,
    warning: false,
    warningNumber: 3,
    forced: true,
    forcedHandle: safeHandle,
    lockedUntil: lockUntil.toISOString(),
    message: `Your handle has been set to ${safeHandle} due to repeated inappropriate language violations. You can change your handle after ${lockUntil.toLocaleDateString()} at ${lockUntil.toLocaleTimeString()}.`,
  };
}
