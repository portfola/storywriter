/**
 * Audio Cache Service
 *
 * Provides memory-based caching for generated TTS audio to reduce API costs
 * and improve replay performance. Uses FIFO eviction strategy with a maximum
 * capacity of 20 entries.
 *
 * Cache Key Format: `storyId-pageIndex`
 * Example: "story-123-0", "story-456-5"
 *
 * Memory Usage: ~0.5-1MB per page × 20 pages = 10-20MB max
 */

const MAX_CACHE_SIZE = 20;

export class AudioCache {
  private cache: Map<string, Uint8Array>;
  private insertionOrder: string[];

  constructor() {
    this.cache = new Map();
    this.insertionOrder = [];
  }

  /**
   * Retrieves cached audio for a given key
   * @param key - Cache key in format "storyId-pageIndex"
   * @returns Cached audio buffer or null if not found
   */
  get(key: string): Uint8Array | null {
    return this.cache.get(key) || null;
  }

  /**
   * Stores audio in cache with FIFO eviction
   * @param key - Cache key in format "storyId-pageIndex"
   * @param audio - Audio buffer to cache
   */
  set(key: string, audio: Uint8Array): void {
    // If key already exists, remove it from insertion order
    if (this.cache.has(key)) {
      this.insertionOrder = this.insertionOrder.filter(k => k !== key);
    }

    // Add to cache and track insertion order
    this.cache.set(key, audio);
    this.insertionOrder.push(key);

    // Evict oldest entry if cache exceeds max size
    if (this.insertionOrder.length > MAX_CACHE_SIZE) {
      const oldestKey = this.insertionOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Clears all cached audio
   * Call this when navigating away from BookReader to free memory
   */
  clear(): void {
    this.cache.clear();
    this.insertionOrder = [];
  }

  /**
   * Returns current cache size
   * Useful for monitoring and debugging
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Checks if a key exists in cache
   * @param key - Cache key to check
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Deletes a specific cache entry
   * Useful for forcing regeneration of audio for a specific page
   * @param key - Cache key to delete
   */
  delete(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.insertionOrder = this.insertionOrder.filter(k => k !== key);
    }
  }
}

// Export singleton instance
export default new AudioCache();
