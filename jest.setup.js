// jest.setup.js
import 'react-native-gesture-handler/jestSetup';

// Mock react-native hooks and utilities
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }) => children || null,
  },
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  Link: ({ children }) => children,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      API_BASE_URL: 'http://localhost:8000',
    },
  },
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// Mock zustand store
jest.mock('@/src/stores/conversationStore', () => ({
  useConversationStore: () => ({
    messages: [],
    addMessage: jest.fn(),
    isRecording: false,
    getError: jest.fn(() => null),
    retryStoryGeneration: jest.fn(),
  }),
}));

// Silence console warnings in tests
const originalConsole = global.console;
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Cleanup function for test environment
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.console = originalConsole;
});