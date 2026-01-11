require('dotenv').config();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_STAGING = process.env.NODE_ENV === 'staging' || process.env.EXPO_ENV === 'staging';
const IS_DEVELOPMENT = !IS_PRODUCTION && !IS_STAGING;


const getApiBaseUrl = () => {
  // Explicit override from environment variable
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  // Environment-based defaults
  const env = process.env.NODE_ENV || process.env.EXPO_ENV || 'development';

  switch (env) {
    case 'production':
      return 'https://api.storywriter.net';
    case 'staging':
      return 'https://staging-api.storywriter.net';
    case 'development':
    default:
      // return 'http://localhost';
      return 'http://127.0.0.1:8000';
  }
};

export default ({ config }) => ({
  ...config,
  expo: {
    name: IS_PRODUCTION ? 'StoryWriter' : IS_STAGING ? 'StoryWriter (Staging)' : 'StoryWriter (Dev)',
    slug: "storywriter",
    version: "0.5.0",
    sdkVersion: "52.0.0",
    orientation: "landscape",
    icon: "./assets/images/icon.png",
    scheme: "storywriter",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    web: {
      "favicon": "./assets/images/favicon.png",
      "output": "static",
      "build": {
        "publicPath": "/storywriter/"
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.portfola.StoryWriter",
      infoPlist: {
        NSMicrophoneUsageDescription: "This app needs access to microphone for voice input",
        NSSpeechRecognitionUsageDescription: "This app needs access to speech recognition for voice commands",
        UIBackgroundModes: ["audio"],
        UISupportedInterfaceOrientations: [
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ]
      }
    },
    android: {
      package: "com.portfola.StoryWriter",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      orientation: "landscape"  // Changed from screenOrientation
    },
    plugins: [
      "expo-dev-client",
      "expo-secure-store"
    ],
    extra: {
      // Backend Integration
      API_BASE_URL: process.env.API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost' : 'https://api.storywriter.net'),
      apiBaseUrl: getApiBaseUrl(),
      environment: IS_PRODUCTION ? 'production' : IS_STAGING ? 'staging' : 'development',

      // Alternative AI Services (Available for Future Use)
      HUGGING_FACE_API_KEY: process.env.HUGGING_FACE_API_KEY,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION,

      eas: {
        projectId: "ddc93476-3b8d-4b46-8ffa-de979a17a116"
      }
    }
  }
});