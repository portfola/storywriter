import Constants from 'expo-constants';
import axios from 'axios';
import base64 from 'base64-js';

const API_KEY = Constants.expoConfig?.extra?.HUGGING_FACE_API_KEY;
const TEXT_API_URL = 'https://api-inference.huggingface.co/models/meta-llama/Llama-2-70b-chat-hf';
const IMAGE_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

// Dynamic backend URL for Laravel integration
const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL ?? 'http://127.0.0.1:8001';

/**
 * HuggingFace Service (Optional - Not Currently Used)
 * 
 * This service provides alternative AI text and image generation using HuggingFace models.
 * Currently disabled in favor of ElevenLabs + Together AI, but available for future use.
 * 
 * Features:
 * - Text generation using Llama-2-70b-chat-hf
 * - Image generation using Stable Diffusion XL
 * - Laravel backend integration for story storage
 */
class HuggingFaceService {
  private client = axios.create({
    baseURL: TEXT_API_URL,
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });

  /**
   * Generate story text and image using HuggingFace models
   * @param prompt Story prompt from user
   * @returns Object with generated text and base64 image URL
   */
  async generateResponse(prompt: string): Promise<{ text: string; imageUrl: string | null }> {
    if (!API_KEY) {
      throw new Error('HUGGING_FACE_API_KEY is not configured in environment variables');
    }

    if (!prompt.trim()) {
      throw new Error('Invalid prompt');
    }

    try {
      // Step 1: Generate the story text
      const textResponse = await this.client.post('', {
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
        },
      });

      const generatedText = textResponse.data[0]?.generated_text.trim() || 'No response';

      // Step 2: Generate the image
      const imageRes = await axios.post(
        IMAGE_API_URL,
        { inputs: `child-friendly, cartoon illustration of ${prompt}` },
        {
          headers: { Authorization: `Bearer ${API_KEY}` },
          responseType: 'arraybuffer',
        }
      );

      const base64Image = base64.fromByteArray(new Uint8Array(imageRes.data));
      const imageUrl = `data:image/jpeg;base64,${base64Image}`;

      // Step 3: Optional Laravel backend storage
      if (BACKEND_URL) {
        try {
          await axios.post(`${BACKEND_URL}/api/stories`, {
            title: prompt.slice(0, 50),
            body: generatedText,
            images: imageUrl,
          });
          console.log('✅ Story saved to Laravel backend');
        } catch (err) {
          console.error('⚠️ Failed to save to Laravel backend:', err);
          // Continue anyway - backend storage is optional
        }
      }

      return { text: generatedText, imageUrl };

    } catch (error) {
      console.error('❌ HuggingFace API Error:', error);
      throw new Error(`HuggingFace service failed: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Check if HuggingFace service is properly configured
   */
  isConfigured(): boolean {
    return !!API_KEY;
  }

  /**
   * Get service configuration status
   */
  getStatus(): { configured: boolean; apiKey: boolean; backendUrl: string | null } {
    return {
      configured: this.isConfigured(),
      apiKey: !!API_KEY,
      backendUrl: BACKEND_URL || null
    };
  }
}

// Export singleton instance
export default new HuggingFaceService();