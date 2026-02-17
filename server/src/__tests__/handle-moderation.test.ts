import { describe, it, expect } from 'vitest';
import { checkHandle, generateSafeHandle, evaluateHandleAttempt } from '../services/handle-moderation';

describe('checkHandle', () => {
  // Clean handles
  it('allows clean handles', () => {
    expect(checkHandle('@sportsfan99').isClean).toBe(true);
    expect(checkHandle('@rally_king').isClean).toBe(true);
    expect(checkHandle('@GoSpartans2026').isClean).toBe(true);
    expect(checkHandle('@j_smith').isClean).toBe(true);
  });

  // Exact blocklist matches
  it('blocks exact profanity', () => {
    expect(checkHandle('@fuck').isClean).toBe(false);
    expect(checkHandle('@FUCK').isClean).toBe(false);
    expect(checkHandle('@shit').isClean).toBe(false);
  });

  it('blocks racial slurs', () => {
    expect(checkHandle('@nigger').isClean).toBe(false);
    expect(checkHandle('@chink').isClean).toBe(false);
  });

  // Substring matches
  it('blocks profanity embedded in longer words', () => {
    expect(checkHandle('@thefuckman').isClean).toBe(false);
    expect(checkHandle('@bigdick99').isClean).toBe(false);
    expect(checkHandle('@shitpost').isClean).toBe(false);
  });

  // Leet-speak detection
  it('blocks leet-speak profanity', () => {
    expect(checkHandle('@sh1t').isClean).toBe(false);   // 1 -> i -> "shit"
    expect(checkHandle('@$h!t').isClean).toBe(false);   // $ -> s, ! -> i -> "shit"
    expect(checkHandle('@d1ck').isClean).toBe(false);   // 1 -> i -> "dick"
  });

  // Repeated characters
  it('blocks collapsed repeated chars', () => {
    expect(checkHandle('@fuuuuck').isClean).toBe(false);
    expect(checkHandle('@sshiiit').isClean).toBe(false);
  });

  // Edge cases
  it('handles empty and single-char handles', () => {
    expect(checkHandle('@a').isClean).toBe(true);
    expect(checkHandle('@').isClean).toBe(true);
  });

  it('does not false-positive on legitimate words', () => {
    expect(checkHandle('@classes').isClean).toBe(true);
    expect(checkHandle('@thebassplayer').isClean).toBe(true);
    expect(checkHandle('@hancock').isClean).toBe(false); // known false positive — substring 'cock'
    expect(checkHandle('@scunthorpe').isClean).toBe(false); // known false positive — substring 'cunt'
  });
});

describe('generateSafeHandle', () => {
  it('generates handle from first initial + last 4 + 123', () => {
    expect(generateSafeHandle('John Smith')).toBe('@jsmit123');
    expect(generateSafeHandle('Jane Doe')).toBe('@jdoe123');
    expect(generateSafeHandle('A B')).toBe('@ab123');
  });

  it('handles single-word names', () => {
    const result = generateSafeHandle('Madonna');
    expect(result).toBe('@madon123');
  });

  it('handles names with special chars', () => {
    expect(generateSafeHandle("O'Brien Jones")).toBe('@ojone123');
  });

  it('handles multi-word names by using last word', () => {
    expect(generateSafeHandle('Mary Jane Watson')).toBe('@mwats123');
  });
});

describe('evaluateHandleAttempt', () => {
  it('allows clean handles', () => {
    const result = evaluateHandleAttempt('@cleanfan', 'John Smith', 0);
    expect(result.allowed).toBe(true);
    expect(result.warning).toBe(false);
    expect(result.forced).toBe(false);
  });

  it('issues warning 1 on first offense', () => {
    const result = evaluateHandleAttempt('@fuckoff', 'John Smith', 0);
    expect(result.allowed).toBe(false);
    expect(result.warning).toBe(true);
    expect(result.warningNumber).toBe(1);
    expect(result.forced).toBe(false);
  });

  it('issues warning 2 on second offense', () => {
    const result = evaluateHandleAttempt('@shithead', 'John Smith', 1);
    expect(result.allowed).toBe(false);
    expect(result.warning).toBe(true);
    expect(result.warningNumber).toBe(2);
    expect(result.forced).toBe(false);
    expect(result.message).toContain('final warning');
  });

  it('forces rename on third offense', () => {
    const result = evaluateHandleAttempt('@dickface', 'John Smith', 2);
    expect(result.allowed).toBe(false);
    expect(result.warning).toBe(false);
    expect(result.forced).toBe(true);
    expect(result.forcedHandle).toBe('@jsmit123');
    expect(result.lockedUntil).toBeTruthy();
    // Verify 72hr lock
    const lockDate = new Date(result.lockedUntil!);
    const now = new Date();
    const hoursDiff = (lockDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(hoursDiff).toBeGreaterThan(71);
    expect(hoursDiff).toBeLessThan(73);
  });

  it('does not force on clean handle even with 2 prior warnings', () => {
    const result = evaluateHandleAttempt('@goodfan', 'John Smith', 2);
    expect(result.allowed).toBe(true);
    expect(result.forced).toBe(false);
  });
});
