import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, createEventSchema, createCrewSchema, lobbyReactionSchema, profileUpdateSchema } from '../lib/validation';

describe('registerSchema', () => {
  it('validates a complete registration', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      handle: '@testuser',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = registerSchema.safeParse({
      password: 'password123',
      name: 'Test User',
      handle: '@testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
      name: 'Test User',
      handle: '@testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: '12345',
      name: 'Test User',
      handle: '@testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      name: '',
      handle: '@testuser',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      handle: '@testuser',
      favoriteSchool: 'school-123',
      userType: 'student',
      birthYear: 2000,
      residingCity: 'New York',
      residingState: 'NY',
    });
    expect(result.success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('validates valid login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'pass123' }).success).toBe(true);
  });

  it('rejects missing password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });
});

describe('createEventSchema', () => {
  it('validates a minimal event', () => {
    const result = createEventSchema.safeParse({
      title: 'Test Game',
      homeSchoolId: 'school-1',
      dateTime: '2026-03-01T19:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing title', () => {
    const result = createEventSchema.safeParse({
      homeSchoolId: 'school-1',
      dateTime: '2026-03-01T19:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('validates with activations', () => {
    const result = createEventSchema.safeParse({
      title: 'Game',
      homeSchoolId: 'school-1',
      dateTime: '2026-03-01T19:00:00Z',
      activations: [
        { type: 'checkin', name: 'Check In', points: 50, description: 'Check in at the event' },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('createCrewSchema', () => {
  it('validates a crew name', () => {
    expect(createCrewSchema.safeParse({ name: 'Dawg Pound' }).success).toBe(true);
  });

  it('rejects single char name', () => {
    expect(createCrewSchema.safeParse({ name: 'A' }).success).toBe(false);
  });
});

describe('lobbyReactionSchema', () => {
  it('validates valid reaction types', () => {
    for (const type of ['FIRE', 'CLAP', 'CRY', 'HORN', 'WAVE', 'HUNDRED']) {
      expect(lobbyReactionSchema.safeParse({ type }).success).toBe(true);
    }
  });

  it('rejects invalid reaction type', () => {
    expect(lobbyReactionSchema.safeParse({ type: 'INVALID' }).success).toBe(false);
  });
});

describe('profileUpdateSchema', () => {
  it('validates tagline update', () => {
    expect(profileUpdateSchema.safeParse({ tagline: 'Go team!' }).success).toBe(true);
  });

  it('validates slug format', () => {
    expect(profileUpdateSchema.safeParse({ profileSlug: 'my-cool-slug' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ profileSlug: 'AB' }).success).toBe(false);
  });
});
