// utils/storyGenerator.js
export const generateStory = (templates, elements, placeholderMapping) => {
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template.pages.map((page, index) => {
      let pageContent = page;
      for (let [question, answer] of Object.entries(elements)) {
        const placeholder = placeholderMapping[question];
        if (placeholder) {
          pageContent = pageContent.replace(new RegExp(`{${placeholder}}`, 'g'), answer);
        }
      }
      
      return {
        title: template.title,
        textContent: pageContent,
        imageUrl: `https://via.placeholder.com/300x200?text=${encodeURIComponent(pageContent.substring(0, 20))}`,
      };
    });
  };