import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tokenBlacklist, InMemoryTokenStore, DistributedTokenBlacklist } from './tokenBlacklist.js';

describe('tokenBlacklist — InMemoryTokenStore', () => {
  const prefix = `mem-${Date.now()}-`;

  it('should not contain a JTI that was never added', () => {
    const store = new InMemoryTokenStore();
    assert.equal(store.has(`${prefix}never-added`), false);
  });

  it('should contain a JTI after it is added', () => {
    const store = new InMemoryTokenStore();
    const jti = `${prefix}added-jti`;
    store.add(jti);
    assert.equal(store.has(jti), true);
    store.delete(jti);
    assert.equal(store.has(jti), false);
  });

  it('should support multiple JTIs and clear', () => {
    const store = new InMemoryTokenStore();
    store.add(`${prefix}1`);
    store.add(`${prefix}2`);
    assert.equal(store.size, 2);
    store.clear();
    assert.equal(store.size, 0);
  });
});

describe('tokenBlacklist — DistributedTokenBlacklist (Issue #147)', () => {
  const prefix = `dist-${Date.now()}-`;

  it('should resolve false for a JTI that was never revoked', async () => {
    const result = await tokenBlacklist.has(`${prefix}never-revoked`);
    assert.equal(result, false);
  });

  it('should resolve true for a JTI after it is added to the blacklist', async () => {
    const jti = `${prefix}revoked-jti`;
    await tokenBlacklist.add(jti);

    const result = await tokenBlacklist.has(jti);
    assert.equal(result, true);

    await tokenBlacklist.delete(jti);
    const afterDelete = await tokenBlacklist.has(jti);
    assert.equal(afterDelete, false);
  });

  it('should not affect other JTIs when one is revoked', async () => {
    const jti1 = `${prefix}jti-1`;
    const jti2 = `${prefix}jti-2`;

    await tokenBlacklist.add(jti1);

    assert.equal(await tokenBlacklist.has(jti1), true);
    assert.equal(await tokenBlacklist.has(jti2), false);

    await tokenBlacklist.delete(jti1);
  });

  it('should support multiple revoked JTIs concurrently', async () => {
    const jtiA = `${prefix}multi-A`;
    const jtiB = `${prefix}multi-B`;

    await Promise.all([
      tokenBlacklist.add(jtiA),
      tokenBlacklist.add(jtiB),
    ]);

    assert.equal(await tokenBlacklist.has(jtiA), true);
    assert.equal(await tokenBlacklist.has(jtiB), true);

    await tokenBlacklist.delete(jtiA);
    await tokenBlacklist.delete(jtiB);
  });

  it('should handle non-string and empty inputs gracefully', async () => {
    assert.equal(await tokenBlacklist.has(null), false);
    assert.equal(await tokenBlacklist.has(undefined), false);
    assert.equal(await tokenBlacklist.has(''), false);
    assert.equal(await tokenBlacklist.has(123), false);

    // add should not throw on falsy or non-string
    await tokenBlacklist.add(null);
    await tokenBlacklist.add(undefined);
    await tokenBlacklist.add(123);
  });

  it('should query mock distributed store when not in memory cache', async () => {
    const mockDbStore = new Set();
    const mockModel = {
      exists: async ({ jti }) => mockDbStore.has(jti),
      updateOne: async ({ jti }) => { mockDbStore.add(jti); },
      deleteOne: async ({ jti }) => { mockDbStore.delete(jti); },
    };

    const isolatedMemory = new InMemoryTokenStore();
    const blacklist = new DistributedTokenBlacklist({
      memoryStore: isolatedMemory,
      model: mockModel,
    });

    const jti = `${prefix}distributed-check`;

    // Simulate JTI was blacklisted on another server instance (present in DB, not in local memory)
    mockDbStore.add(jti);
    assert.equal(isolatedMemory.has(jti), false, 'L1 memory store should initially not have it');

    // When has() is called, it should hit L2 store and warm L1 cache
    const exists = await blacklist.has(jti);
    assert.equal(exists, true, 'Should find JTI from distributed store');
    assert.equal(isolatedMemory.has(jti), true, 'L1 memory store should now be warmed with JTI');
  });
});
