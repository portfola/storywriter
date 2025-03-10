import Constants from 'expo-constants';
import axios from 'axios';

const API_KEY = Constants.expoConfig?.extra?.HUGGING_FACE_API_KEY;
const TEXT_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3';
const IMAGE_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

class HuggingFaceService {
  private client = axios.create({ baseURL: TEXT_API_URL, headers: { 'Authorization': `Bearer ${API_KEY}` } });

  async generateResponse(prompt: string): Promise<string> {
    if (!prompt.trim()) throw new Error('Invalid prompt');
    const { data } = await this.client.post('', { inputs: prompt, parameters: { max_new_tokens: 500 } });
    return data[0]?.generated_text.trim() || 'No response';
  }

  async generateImage(prompt: string): Promise<string | null> {
    const { data } = await axios.post(IMAGE_API_URL, { inputs: `child-friendly, cartoon illustration of ${prompt}` }, { headers: { 'Authorization': `Bearer ${API_KEY}` }, responseType: 'arraybuffer' });
    return `data:image/jpeg;base64,${Buffer.from(data).toString('base64')}`;
  }
}

export default new HuggingFaceService();