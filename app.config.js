require('dotenv').config();

export default ({ config }) => ({
  ...config, 
  expo: {
    name: "StoryWriter",
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
      // Primary AI Services (Currently Active)
      TOGETHER_API_KEY: process.env.TOGETHER_API_KEY,
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
      
      // Alternative AI Services (Available for Future Use)
      HUGGING_FACE_API_KEY: process.env.HUGGING_FACE_API_KEY,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION,
      
      // Backend Integration (Optional)
      BACKEND_URL: process.env.BACKEND_URL,
      
      eas: {
        projectId: "ddc93476-3b8d-4b46-8ffa-de979a17a116"
      }
    }
  }
});