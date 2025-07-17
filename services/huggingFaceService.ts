import Constants from 'expo-constants';
import axios from 'axios';
import base64 from 'base64-js'; // ✅ Use base64-js instead of Buffer

const API_KEY = Constants.expoConfig?.extra?.HUGGING_FACE_API_KEY;
//const TEXT_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3';
// const TEXT_API_URL  = 'moonshotai/Kimi-K2-Instruct';
const TEXT_API_URL = 'meta-llama/Llama-2-70b-chat-hf';
const IMAGE_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

// ✅ Dynamic backend URL
const BACKEND_URL =
  Constants.expoConfig?.extra?.BACKEND_URL ?? 'http://127.0.0.1:8001'; // default to localhost:8001


class HuggingFaceService {

  private client = axios.create({
    baseURL: TEXT_API_URL,
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });

  async generateResponse(prompt: string): Promise<{ text: string; imageUrl: string | null }> {
    if (!prompt.trim()) throw new Error('Invalid prompt');
  
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

    axios.post(`${BACKEND_URL}/api/stories`, {
      title: prompt.slice(0, 50),
      body: generatedText,
      images: imageUrl,
  }).catch((err) => {
      console.error('Failed to save to Laravel, but proceeding anyway', err);
  });
  
    return { text: generatedText, imageUrl };
  }
  
  
}

export default new HuggingFaceService();
