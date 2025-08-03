import Together from 'together-ai';
import Constants from 'expo-constants';

const TOGETHER_API_KEY = Constants.expoConfig?.extra?.TOGETHER_API_KEY;

class TogetherAIService {
  private client: Together;

  constructor() {
    if (!TOGETHER_API_KEY) {
      throw new Error('TOGETHER_API_KEY is not configured in environment variables. Please add it to your app.config.js and environment.');
    }

    this.client = new Together({
      apiKey: TOGETHER_API_KEY,
    });
  }

  async generateResponse(prompt: string): Promise<{ text: string; imageUrl: string | null }> {
    if (!prompt.trim()) throw new Error('Invalid prompt');

    try {
      // Generate text
      const textResponse = await this.client.chat.completions.create({
        model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
        messages: [
          {
            role: "user",
            content: `Create a children's story based on: ${prompt}`
          }
        ],
        max_tokens: 512,
        temperature: 0.7,
      });

      const generatedText = textResponse.choices[0]?.message?.content || '';

      // Generate image
      const imageResponse = await this.client.images.create({
        model: "black-forest-labs/FLUX.1-schnell",
        prompt: `child-friendly cartoon illustration of ${prompt}`,
        width: 512,
        height: 512,
      });
      
      // Handle both possible response formats
      const imageData = imageResponse.data[0];
      let imageUrl: string | null = null;
      
      if (imageData) {
        if ('url' in imageData) {
          imageUrl = imageData.url;
        } else if ('b64_json' in imageData) {
          // Convert base64 to data URL
          imageUrl = `data:image/png;base64,${imageData.b64_json}`;
        }
      }
      
      return { text: generatedText, imageUrl };
    } catch (error) {
      console.error('Together.ai API Error:', error);
      throw error;
    }
  }
}

export default new TogetherAIService();