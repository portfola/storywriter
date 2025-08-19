require('dotenv').config();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_STAGING = process.env.EXPO_ENV === 'staging';

const getApiBaseUrl = () => {
  if (IS_PRODUCTION) {
    return 'https://api.storywriter.net';
  } else if (IS_STAGING) {
    return 'https://api-staging.storywriter.net';
  } else {
    return 'http://localhost:8000'; // Local development
  }
};

export default ({ config }) => ({
  ...config, 
  expo: {
    name: IS_PRODUCTION ? 'StoryWriter' : `StoryWriter (${IS_STAGING ? 'Staging' : 'Dev'})`,
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
      "publicPath": "/storywriter/"
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
      "expo-dev-client"
    ],
    extra: {
      // Backend Integration
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