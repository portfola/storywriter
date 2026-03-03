# CLAUDE.md - StoryWriter Project Guide

## Project Overview

StoryWriter is an interactive digital storybook creation app designed for children to use on tablets. Kids can speak with an AI assistant to generate text and images in a storybook display, with the machine reading stories aloud.

**Live Site**: https://storywriter.net
**Purpose**: Entertainment and encouraging a love of books and storytelling in young technologists

## Technology Stack

### Core Framework
- **React Native** (0.79.5) with **Expo** (~53.0.17)
- **Expo Router** (~5.1.3) for file-based navigation
- **TypeScript** (~5.8.3) for type safety
- **React** (19.2.3)

### AI & Voice Services
- **ElevenLabs**: TTS and Conversational AI
- **Together AI**: Story and image generation

### State & Storage
- **Zustand** (^5.0.6): Global state management
- **AsyncStorage**: General data persistence
- **SecureStore**: Sensitive data storage

### Testing & Quality
- **Jest** (^29.7.0) with jest-expo preset
- **React Native Testing Library** (^13.3.1)
- **ESLint** with TypeScript support
- **TypeScript**: Strict mode enabled

## Project Structure

```
app/                        # Expo Router navigation
  (auth)/                   # Authentication routes (login)
  (tabs)/                   # Main tab navigation
    index.tsx               # Home/story creation screen
    about.tsx               # About page
    bookshelf/              # Bookshelf feature
components/                 # Reusable UI components
  AudioVisualizer/          # Visual feedback for audio
  BookReader/               # Story display component
  ConversationInterface/    # Voice interaction UI
  StoryContent/             # Story rendering
  WelcomeOverlay/           # Onboarding
services/                   # External service integrations
  elevenLabsService.ts      # ElevenLabs Agent and TTS
  storyGenerationService.ts # AI story generation
src/
  api/                      # API client configuration
  context/                  # React contexts (AuthContext)
  stores/                   # Zustand stores (conversationStore)
  utils/                    # Utility functions
types/                      # TypeScript type definitions
terraform/                  # Infrastructure as Code
```

## Development Guidelines

### Code Organization
- Use **functional components** with hooks (no class components)
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks in `src/hooks/` or `hooks/`
- Platform-specific code: Use `.native.ts` and `.web.ts` extensions

### TypeScript Conventions
- Always define proper types (avoid `any`)
- Use interfaces for component props
- Define types in `types/` directory for shared types
- Use type inference where appropriate

### Component Structure
```typescript
// Component structure example
import React from 'react';
import { View, Text } from 'react-native';

interface ComponentProps {
  title: string;
  onPress?: () => void;
}

export function Component({ title, onPress }: ComponentProps) {
  // Component logic
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
}
```

### Styling
- Styles are co-located with components or in `assets/styles/`
- Use `.style.ts` or `.style.js` suffix for style files
- StyleSheet.create() for React Native styles

### State Management
- Use **Zustand** for global state (see `src/stores/conversationStore.ts`)
- Use React hooks (useState, useContext) for local component state
- Keep state as close to where it's used as possible

### Service Integration

#### Error Handling
- Use try-catch blocks for async operations
- Utilize `src/utils/errorHandler.ts` for consistent error handling
- Log errors appropriately using `src/utils/logger.ts`

### Testing
- Write tests for critical business logic
- Test files: `__tests__/ComponentName-test.tsx`
- Run tests: `npm test`
- Type check: `npm run type-check`
- Lint: `npm run lint`

### Git Workflow
- **Main branch**: `main`
- Feature branches: descriptive names (e.g., `vocal`, `bookshelf`)
- Keep commits atomic and well-described
- Run `npm run validate` before committing (type-check + tests)

## Key Features

### Voice Interaction
- Real-time conversation with AI assistant
- Audio visualization during recording

### Story Generation
- AI-powered story creation via Together AI
- Image generation for story illustrations
- Parsing and formatting of story content

### Text-to-Speech Narration
- Primary: ElevenLabs for enhanced voices
- Platform-specific implementations for optimal performance

### Bookshelf
- Story storage and retrieval
- Browse previously created stories

## Environment Variables

Required environment variables (see `.env` file):
- ElevenLabs API key
- Together AI API key
- Backend API endpoints

**Note**: Never commit `.env` file to version control.

## Platform Considerations

### Web
- Uses web-specific implementations for audio services
- Responsive design for desktop/tablet browsers
- Homepage path: `/storywriter` (configured in package.json)

### Mobile (iOS/Android)
- Native implementations for better audio performance
- Tablet-optimized UI
- Screen orientation handling via expo-screen-orientation

## Build & Deploy

### Development
```bash
npm start              # Start Expo dev server
npm run web            # Web development
npm run android        # Android development
npm run ios            # iOS development
```

### Testing & Validation
```bash
npm run type-check     # TypeScript validation
npm test               # Run Jest tests
npm run lint           # ESLint check
npm run validate       # Full validation (type-check + tests)
```

### Production Build
```bash
npm run build:web      # Export web build
```

### Infrastructure
- Terraform configurations in `terraform/` directory
- Separate configs for backend, staging, and production
- Frontend hosted with infrastructure as code

## Common Patterns

### Async Operations
```typescript
try {
  const result = await someAsyncOperation();
  // Handle success
} catch (error) {
  logger.error('Operation failed', error);
  // Handle error gracefully
}
```

### Zustand Store Usage
```typescript
import { useConversationStore } from '@/stores/conversationStore';

function Component() {
  const messages = useConversationStore((state) => state.messages);
  const addMessage = useConversationStore((state) => state.addMessage);

  // Use store data
}
```

## Best Practices

1. **Child-Friendly Design**: Remember the target audience is children on tablets
2. **Performance**: Optimize for smooth interactions, especially audio/voice
3. **Error Handling**: Fail gracefully with user-friendly messages
4. **Security**: Use SecureStore for sensitive data, never log credentials
5. **Accessibility**: Consider accessibility features for inclusive design
6. **Cross-Platform**: Test features on web and mobile platforms
7. **Code Quality**: Run validation before committing changes

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [ElevenLabs API Documentation](https://elevenlabs.io/docs)

## Notes

- Current active development on vocal narration features (vocal branch)
- Focus on intuitive, engaging UI for young users
- Prioritize performance in audio/voice features for best user experience
