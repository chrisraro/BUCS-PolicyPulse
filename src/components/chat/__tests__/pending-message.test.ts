import { describe, expect, it } from 'vitest'
import { PENDING_MESSAGE_KEY, savePending, takePending } from '../pending-message'

/** Minimal in-memory `Storage` fake — good enough for vitest's node environment. */
class FakeStorage implements Storage {
  private map = new Map<string, string>()

  get length() {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
}

/** A `Storage` whose read/write methods always throw — simulates private-mode quota errors. */
class ThrowingStorage implements Storage {
  get length() {
    return 0
  }
  clear(): void {
    throw new Error('storage disabled')
  }
  getItem(): string | null {
    throw new Error('storage disabled')
  }
  key(): string | null {
    throw new Error('storage disabled')
  }
  removeItem(): void {
    throw new Error('storage disabled')
  }
  setItem(): void {
    throw new Error('storage disabled')
  }
}

describe('pending-message store', () => {
  it('round-trips a saved message through takePending', () => {
    const storage = new FakeStorage()
    savePending('What is the grading policy?', storage)
    expect(takePending(storage)).toBe('What is the grading policy?')
  })

  it('clears the entry once taken', () => {
    const storage = new FakeStorage()
    savePending('How do I file an appeal?', storage)
    takePending(storage)
    expect(takePending(storage)).toBeNull()
    expect(storage.getItem(PENDING_MESSAGE_KEY)).toBeNull()
  })

  it('returns null when nothing was ever saved', () => {
    const storage = new FakeStorage()
    expect(takePending(storage)).toBeNull()
  })

  it('is a safe no-op when the storage throws (e.g. private browsing)', () => {
    const storage = new ThrowingStorage()
    expect(() => savePending('text', storage)).not.toThrow()
    expect(() => takePending(storage)).not.toThrow()
    expect(takePending(storage)).toBeNull()
  })
})
