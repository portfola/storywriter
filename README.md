# StoryWriter

Create your own digital storybooks with the help of a cyber assistant!

## Jan 2025 Dev Notes

With the help of Claude AI LLM ([https://claude.ai](https://claude.ai)), I am creating this app for kids to be able to speak with an AI assistant to generate text and images in a storybook display. I am learning React Native and Typescript as I go.

My initial vision was to build an app that would self-contain its own LLM, but this proved difficult (app size was just too big), so it now uses an API connection to Hugging Face. Be sure to follow the instructions to enter your API key so this connection will work.

However, current status, as of Jan 23, is that we have critical failures immediately upon progressing past the initial splash screen. There appears to be an infinite loop happening...

## Project Description
This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

An active connection to Hugging Face API is required ([https://huggingface.co](https://huggingface.co)). Add a .env file to the root directory with contents: `HUGGING_FACE_API_KEY=xxxxxx'.

## Get started (original readme from Expo)

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
