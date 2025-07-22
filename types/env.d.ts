declare module '@env' {
    // Primary AI Services (Currently Active)
    export const ELEVENLABS_API_KEY: string;
    export const TOGETHER_API_KEY: string;
    
    // Alternative AI Services (Available for Future Use)
    export const HUGGING_FACE_API_KEY: string;
    export const AWS_ACCESS_KEY_ID: string;
    export const AWS_SECRET_ACCESS_KEY: string;
    export const AWS_REGION: string;
    
    // Backend Integration (Optional)
    export const BACKEND_URL: string;
  }