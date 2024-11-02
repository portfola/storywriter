import { StoryTemplate } from '../data/storyData';

interface StoryElements {
  [key: string]: string;
}

export interface StoryPage {
  textContent: string;
  imageUrl: string;
}

export function generateStory(
  templates: StoryTemplate[],
  elements: StoryElements,
  placeholderMapping: { [key: string]: string }
): StoryPage[] {
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  return template.pages.map(page => {
    let pageContent = page;
    for (let [question, answer] of Object.entries(elements)) {
      const placeholder = placeholderMapping[question];
      if (placeholder) {
        pageContent = pageContent.replace(new RegExp(`{${placeholder}}`, 'g'), answer);
      }
    }
    
    return {
      textContent: pageContent,
      imageUrl: generateImage(pageContent) // This function should be implemented
    };
  });
}

function generateImage(prompt: string): string {
  // In a real application, this would call an image generation API
  // For now, we'll use a placeholder image service
  return `https://via.placeholder.com/300x200?text=${encodeURIComponent(prompt.substring(0, 30))}`;
}