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
- [ ] Install expo-av: `npx expo install expo-av`
- [ ] Verify audio permissions in app.config.js

**Create Service Files**
- [ ] Create `services/narration/types.ts` - Define NarrationPlayer interface
- [ ] Create `services/narration/web.ts` - HTML5 Audio implementation
- [ ] Create `services/narration/native.ts` - expo-av implementation
- [ ] Create `services/narration/index.ts` - Platform-appropriate export

**Web Player (`web.ts`)**
- [ ] Implement NarrationPlayer interface
- [ ] Convert Uint8Array to Blob URL for HTML5 Audio
- [ ] Handle play/pause state
- [ ] Fire completion callback when audio ends
- [ ] Implement cleanup to revoke Blob URLs

**Native Player (`native.ts`)**
- [ ] Implement NarrationPlayer interface
- [ ] Load audio from Uint8Array using expo-av
- [ ] Configure audio session for playback
- [ ] Handle playback status updates
- [ ] Implement cleanup to unload sound

### 2. Audio Cache

- [ ] Create `services/narration/audioCache.ts`
- [ ] Implement Map-based cache with max 20 entries
- [ ] Add get(key) method - returns Uint8Array or null
- [ ] Add set(key, audio) method - stores with FIFO eviction
- [ ] Add clear() method - wipes entire cache
- [ ] Export singleton instance

**Cache Key Format**: `storyId-pageIndex`

### 3. Store State

- [ ] Open `src/stores/conversationStore.ts`
- [ ] Add narration state to interface:
  - [ ] `isNarrationEnabled: boolean`
  - [ ] `isNarrationPlaying: boolean`
  - [ ] `isLoadingAudio: boolean`
  - [ ] `autoAdvancePages: boolean`
- [ ] Add state mutation actions:
  - [ ] `setNarrationEnabled(enabled: boolean)`
  - [ ] `setNarrationPlaying(playing: boolean)`
  - [ ] `setLoadingAudio(loading: boolean)`
  - [ ] `setAutoAdvancePages(auto: boolean)`

### 4. BookReader Integration

- [ ] Open `components/BookReader/BookReader.tsx`
- [ ] Import narration service, audio cache, elevenlabs service, store
- [ ] Add local state for player instance and audio error
- [ ] Generate audio on page change:
  - [ ] Check if narration enabled
  - [ ] Check cache first (key: `storyId-pageIndex`)
  - [ ] If cache miss, call `elevenLabsService.generateSpeech()` with flash model
  - [ ] Store result in cache
  - [ ] Load audio into player
  - [ ] Handle errors and set loading states
- [ ] Implement playback controls:
  - [ ] `handlePlay()` - calls player.play() and updates state
  - [ ] `handlePause()` - calls player.pause() and updates state
  - [ ] Register completion callback for auto-advance (1.5s delay)
- [ ] Add cleanup on unmount - call player.cleanup()

### 5. Narration Controls UI

- [ ] Create `components/NarrationControls/NarrationControls.tsx`
- [ ] Create `components/NarrationControls/NarrationControls.style.ts`
- [ ] Define component props interface
- [ ] Implement minimal MVP controls:
  - [ ] Narration on/off toggle (Switch)
  - [ ] Play/Pause button (TouchableOpacity with icon)
  - [ ] Auto-advance toggle (Switch)
  - [ ] Loading spinner (ActivityIndicator)
  - [ ] Error message display (Text)
- [ ] Style for tablet:
  - [ ] Minimum 44x44px touch targets
  - [ ] Bottom overlay or fixed bar layout
  - [ ] Hide controls when narration disabled
- [ ] Integrate into BookReader component

### 6. Error Handling

- [ ] Display network timeout errors with message
- [ ] Show rate limit (429) error and disable narration temporarily
- [ ] Show invalid audio errors with retry option
- [ ] Log playback failures and reset player state
- [ ] No exponential backoff for MVP - manual retry only

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
