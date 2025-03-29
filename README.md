# StoryWriter

Create your own digital storybooks with the help of a cyber assistant!

This app is designed for kids to use on a tablet. They can speak with an AI assistant to generate text and images in a storybook display.

## Project Description
This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

An active connection to Hugging Face API is required ([https://huggingface.co](https://huggingface.co)). Add a .env file to the root directory with contents: [`HUGGING_FACE_API_KEY=xxxxxx'].

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

## Dev Notes

### Mar 2025
Tim has got a version working which creates the story and displays on one page with a single image at the top. I've been working on replacing the robot voice with AWS Polly.

Next steps:

- Merge my Polly feature branch into develop
- Have Polly read the generated story out loud
- Add play/pause button for reading narration

### Feb 2025
I've enlisted help from my (human) friend Tim, who has worked on a refactor of story.tsx to remove unused sections and focus on getting the initial assistant conversation going. We are working on the `develop` branch.

#### Feb 23
I've added AWS Transcribe to the project on `develop`. You'll need to update `.env` file with these keys:

```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
```

### Jan 2025
With the help of Claude AI LLM ([https://claude.ai](https://claude.ai)), I am creating this tablet app for kids. They will be able to speak with an AI assistant to generate text and images in a storybook display. I am learning React Native and Typescript as I go.

My initial vision was to build an app that would self-contain its own LLM, but this proved difficult (app size was just too big), so it now uses an API connection to Hugging Face. Be sure to follow the instructions to enter your API key so this connection will work.

#### Jan 24
Infinite loop is resolved! You can launch the app and click the opening button to start the conversation with the assistant.
Next step is to get the assistant to listen and hear your voice response.

