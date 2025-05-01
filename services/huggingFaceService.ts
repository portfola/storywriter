import Constants from 'expo-constants';
import axios from 'axios';
import base64 from 'base64-js'; // ✅ Use base64-js instead of Buffer

const API_KEY = Constants.expoConfig?.extra?.HUGGING_FACE_API_KEY;
const TEXT_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3';
const IMAGE_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

class HuggingFaceService {

  private client = axios.create({
    baseURL: TEXT_API_URL,
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });

  async generateFullStory(prompt: string): Promise<{ text: string; imageUrl: string | null }> {
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
  
    // Step 3: Persist the story to Laravel backend
    await axios.post('http://127.0.0.1:8001/api/stories', {
      title: prompt.slice(0, 50), // Trim title from prompt or improve this logic
      content: generatedText,
      image_url: imageUrl,
    });
  
    return { text: generatedText, imageUrl };
  }
  
  
}

export default new HuggingFaceService();
