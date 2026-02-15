# Vocal Narration - MVP Task List

## Overview

Add page-by-page text-to-speech narration to BookReader. Users can play/pause audio for the current page and optionally auto-advance to the next page.

**Implementation Details**: See `docs/elevenlabs.md` for all code examples and API documentation.

---

## Architecture Decisions

### ⚠️ Dual Implementation Strategy
- **Issue**: Current service supports SDK client + Laravel backend paths
- **MVP Decision**: Use Laravel backend path only for centralized auth and monitoring
- **Action**: Remove SDK client initialization for TTS (keep for Conversational Agents only)

### Storage Strategy: Buffered MP3 with Aggressive Caching
- **Approach**: Generate full MP3 audio buffer (not streaming)
- **Rationale**: Children replay stories frequently; caching saves API costs
- **Cache**: Memory-based, 20 pages max (~10-20MB), FIFO eviction
- **Trade-off**: 1-2s initial wait acceptable for replay benefits

### Model Configuration
- **Model**: `eleven_flash_v2_5` (fast, 0.5-1.5s latency)
- **Voice**: Cassidy (ID: 56AoDkrOh6qfVPDXZ7Pt)
- **Route**: Laravel backend only

---

## Task Checklist

### 1. Audio Player Service

**Dependencies**
- [x] Install expo-av: `npx expo install expo-av` (2026-02-15)
- [x] Verify audio permissions in app.config.js (2026-02-15)

**Create Service Files**
- [x] Create `services/narration/types.ts` - Define NarrationPlayer interface (2026-02-15)
- [x] Create `services/narration/web.ts` - HTML5 Audio implementation (2026-02-15)
- [x] Create `services/narration/native.ts` - expo-av implementation (2026-02-15)
- [x] Create `services/narration/index.ts` - Platform-appropriate export (2026-02-15)

**Web Player (`web.ts`)**
- [x] Implement NarrationPlayer interface (2026-02-15)
- [x] Convert Uint8Array to Blob URL for HTML5 Audio (2026-02-15)
- [x] Handle play/pause state (2026-02-15)
- [x] Fire completion callback when audio ends (2026-02-15)
- [x] Implement cleanup to revoke Blob URLs (2026-02-15)

**Native Player (`native.ts`)**
- [x] Implement NarrationPlayer interface (2026-02-15)
- [x] Load audio from Uint8Array using expo-av (2026-02-15)
- [x] Configure audio session for playback (2026-02-15)
- [x] Handle playback status updates (2026-02-15)
- [x] Implement cleanup to unload sound (2026-02-15)

### 2. Audio Cache

- [x] Create `services/narration/audioCache.ts` (2026-02-15)
- [x] Implement Map-based cache with max 20 entries (2026-02-15)
- [x] Add get(key) method - returns Uint8Array or null (2026-02-15)
- [x] Add set(key, audio) method - stores with FIFO eviction (2026-02-15)
- [x] Add clear() method - wipes entire cache (2026-02-15)
- [x] Export singleton instance (2026-02-15)

**Cache Key Format**: `storyId-pageIndex`

### 3. Store State

- [x] Open `src/stores/conversationStore.ts` (2026-02-15)
- [x] Add narration state to interface: (2026-02-15)
  - [x] `isNarrationEnabled: boolean` (2026-02-15)
  - [x] `isNarrationPlaying: boolean` (2026-02-15)
  - [x] `isLoadingAudio: boolean` (2026-02-15)
  - [x] `autoAdvancePages: boolean` (2026-02-15)
- [x] Add state mutation actions: (2026-02-15)
  - [x] `setNarrationEnabled(enabled: boolean)` (2026-02-15)
  - [x] `setNarrationPlaying(playing: boolean)` (2026-02-15)
  - [x] `setLoadingAudio(loading: boolean)` (2026-02-15)
  - [x] `setAutoAdvancePages(auto: boolean)` (2026-02-15)

### 4. BookReader Integration

- [x] Open `components/BookReader/BookReader.tsx` (2026-02-15)
- [x] Import narration service, audio cache, elevenlabs service, store (2026-02-15)
- [x] Add local state for player instance and audio error (2026-02-15)
- [x] Generate audio on page change: (2026-02-15)
  - [x] Check if narration enabled (2026-02-15)
  - [x] Check cache first (key: `storyId-pageIndex`) (2026-02-15)
  - [x] If cache miss, call `elevenLabsService.generateSpeech()` with flash model (2026-02-15)
  - [x] Store result in cache (2026-02-15)
  - [x] Load audio into player (2026-02-15)
  - [x] Handle errors and set loading states (2026-02-15)
- [x] Implement playback controls: (2026-02-15)
  - [x] `handlePlay()` - calls player.play() and updates state (2026-02-15)
  - [x] `handlePause()` - calls player.pause() and updates state (2026-02-15)
  - [x] Register completion callback for auto-advance (1.5s delay) (2026-02-15)
- [x] Add cleanup on unmount - call player.cleanup() (2026-02-15)

### 5. Narration Controls UI

- [x] Create `components/NarrationControls/NarrationControls.tsx` (2026-02-15)
- [x] Create `components/NarrationControls/NarrationControls.style.ts` (2026-02-15)
- [x] Define component props interface (2026-02-15)
- [x] Implement minimal MVP controls: (2026-02-15)
  - [x] Narration on/off toggle (Switch) (2026-02-15)
  - [x] Play/Pause button (TouchableOpacity with icon) (2026-02-15)
  - [x] Auto-advance toggle (Switch) (2026-02-15)
  - [x] Loading spinner (ActivityIndicator) (2026-02-15)
  - [x] Error message display (Text) (2026-02-15)
- [x] Style for tablet: (2026-02-15)
  - [x] Minimum 44x44px touch targets (2026-02-15)
  - [x] Bottom overlay or fixed bar layout (2026-02-15)
  - [x] Hide controls when narration disabled (2026-02-15)
- [x] Integrate into BookReader component (2026-02-15)

### 6. Error Handling

- [x] Display network timeout errors with message (2026-02-15)
- [x] Show rate limit (429) error and disable narration temporarily (2026-02-15)
- [x] Show invalid audio errors with retry option (2026-02-15)
- [x] Log playback failures and reset player state (2026-02-15)
- [x] No exponential backoff for MVP - manual retry only (2026-02-15)

### 7. Testing

**Manual Testing Checklist**
- [ ] Play button generates audio and plays on web
- [ ] Play button generates audio and plays on iOS
- [ ] Play button generates audio and plays on Android
- [ ] Pause button works mid-playback
- [ ] Auto-advance navigates to next page after audio completes
- [ ] Cache hit (replay page) doesn't regenerate audio
- [ ] Navigation to new page stops current audio
- [ ] Error states display correctly
- [ ] Toggling narration off hides controls
- [ ] Memory doesn't leak over 20 pages
- [ ] Clear cache when navigating away from BookReader

**Skip for MVP**: Unit tests, integration tests

---

## Platform Differences

| Feature | Web | Native (iOS/Android) |
|---------|-----|---------------------|
| Audio API | HTML5 Audio | expo-av Sound |
| Audio Format | MP3 (Blob URL) | MP3 (Uint8Array) |
| Playback Control | audio.play() | sound.playAsync() |
| Auto-play | Requires user gesture first time | Unrestricted |

---

## Technical Constraints

### ElevenLabs API
- Model: `eleven_flash_v2_5`
- Voice: Cassidy (56AoDkrOh6qfVPDXZ7Pt)
- Character limit: 5000 chars per request
- Cost: ~0.024 credits per character
- Latency: ~0.5-1.5s per page
- Route: Laravel backend only

### Memory Management
- Cache size: ~0.5-1MB per page × 20 pages = 10-20MB max
- Clear cache when navigating away from BookReader
- FIFO eviction when cache exceeds 20 entries
- No persistence to AsyncStorage (regenerate on app restart)

### Performance
- Generate audio on page mount (not on play button press)
- Show loading spinner during generation (1-2s typical)
- Optional: Pre-generate next page in background (low priority)
- No streaming for MVP

---

## Open Questions

1. **Persist cache to AsyncStorage for offline replay?**
   - **MVP Decision**: No. Regenerate on each session.

2. **Pre-generate all pages on story load?**
   - **MVP Decision**: No. Generate on-demand per page.

3. **Support background playback?**
   - **MVP Decision**: No. Pause on background.

---

## Excluded from MVP

The following features are **explicitly removed** to reduce scope:

- ❌ Playback speed controls (1x speed only)
- ❌ Voice selection (Cassidy only)
- ❌ Model selection (Flash only)
- ❌ Seek/scrubbing controls
- ❌ Progress bar / time display
- ❌ Waveform visualization
- ❌ Text highlighting during narration
- ❌ Keyboard shortcuts
- ❌ Volume control (system volume only)
- ❌ Settings panel / preferences
- ❌ AsyncStorage persistence of cache
- ❌ Pre-loading next page audio
- ❌ Full story narration mode
- ❌ Background audio playback
- ❌ Offline mode detection
- ❌ Downloadable narrated stories
- ❌ Multiple voice support
- ❌ Accessibility features (ARIA labels, screen reader optimization)
- ❌ High contrast mode
- ❌ Unit/integration tests (manual testing only)

---

## References

- **[docs/elevenlabs.md](./elevenlabs.md)** - Complete implementation guide with all code examples
- [expo-av Documentation](https://docs.expo.dev/versions/latest/sdk/audio/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement)
