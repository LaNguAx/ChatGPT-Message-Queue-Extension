import { describe, it, expect } from 'vitest';
import { uuid } from '../src/util/uuid';

describe('uuid', () => {
  it('produces canonical v4 strings', () => {
    const id = uuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('produces distinct values across many calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(uuid());
    expect(seen.size).toBe(1000);
  });
});
