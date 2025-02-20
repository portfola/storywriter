// services/huggingFaceService.js
import Constants from 'expo-constants';
import axios from 'axios';

import { HUGGING_FACE_API_KEY } from "@env";

console.log("API Key type:", typeof HUGGING_FACE_API_KEY);
console.log("API Key:", HUGGING_FACE_API_KEY);


const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

class HuggingFaceService {
  constructor() {
    
    this.apiKey = Constants.expoConfig.extra.HUGGING_FACE_API_KEY;
    this.client = axios.create({
      baseURL: HUGGING_FACE_API_URL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  

  async generateResponse(prompt, retryCount = 0) {
    // Add validation for empty/invalid prompts
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error('Invalid or empty prompt received');
      throw new Error('Invalid prompt');
    }

    // Check if this is an interview prompt without any conversation history
    if (prompt.includes('Based on our conversation so far') && 
        !prompt.includes('user:')) {
      console.log('Preventing API call with empty conversation history');
      return 'What kind of story would you like to create today?';
    }

    try {
      console.log('\n=== API Request ===');
      console.log('Attempt:', retryCount + 1);
      console.log('URL:', HUGGING_FACE_API_URL);
      console.log('API Key (first 8 chars):', this.apiKey?.substring(0, 8));
      
      const formattedPrompt = `<s>[INST] ${prompt} [/INST]`;
      console.log('Formatted Prompt:', formattedPrompt);

      const parameters = {
        max_new_tokens: 2000,
        temperature: 0.7,
        top_p: 0.95,
        do_sample: true,
        return_full_text: false,
        wait_for_model: true,
      };
      
      console.log('Parameters:', parameters);

      const startTime = Date.now();
      
      const response = await this.client.post('', {
        inputs: formattedPrompt,
        parameters,
      });

      const endTime = Date.now();
      
      console.log('\n=== API Response ===');
      console.log('Time taken:', endTime - startTime, 'ms');
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      console.log('Full response data:', response.data);

      if (!response.data?.[0]?.generated_text) {
        console.error('Invalid response structure:', response.data);
        throw new Error('Empty or invalid response received');
      }

      const generatedText = response.data[0].generated_text.trim();
      console.log('Generated text:', generatedText);
      
      return generatedText;
    } catch (error) {
      console.error('\n=== API Error ===');
      console.error('Error:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
        
        if (error.response.status === 503 && error.response.data?.estimated_time) {
          const waitTime = error.response.data.estimated_time * 1000;
          console.log(`Model is loading. Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
          if (retryCount < MAX_RETRIES) {
            return this.generateResponse(prompt, retryCount + 1);
          }
        }
      }

      if (retryCount < MAX_RETRIES) {
        const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Retrying in ${retryDelay}ms...`);
        await this.sleep(retryDelay);
        return this.generateResponse(prompt, retryCount + 1);
      }

      throw error;
    }
  }
}

export default new HuggingFaceService();