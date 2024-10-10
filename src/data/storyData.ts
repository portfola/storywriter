export const questions = [
    "What's the name of your superhero?",
    "What special power does your superhero have?",
    "Where does your superhero live?",
    "Who is your superhero's best friend?",
    "What's the biggest problem your superhero needs to solve?"
  ];
  
  export const placeholderMapping = {
    "What's the name of your superhero?": "hero",
    "What special power does your superhero have?": "power",
    "Where does your superhero live?": "setting",
    "Who is your superhero's best friend?": "friend",
    "What's the biggest problem your superhero needs to solve?": "problem"
  };
  
  export interface StoryTemplate {
    title: string;
    pages: string[];
  }
  
  export const storyTemplates: StoryTemplate[] = [
    {
      title: "The Hero's Journey",
      pages: [
        "In the bustling city of {setting}, there lived an ordinary person named {hero}. Little did they know, their life was about to change forever.",
        "One day, {hero} discovered they had the incredible power to {power}. At first, they were scared and confused by this newfound ability.",
        "Luckily, {hero}'s best friend, {friend}, was there to help. Together, they learned to control and understand the new power.",
        "But trouble was brewing in {setting}. A terrible problem arose: {problem}. The city needed a hero more than ever!",
        "{hero} knew they had to act. Using their power to {power}, they faced the challenge head-on, determined to save their home.",
        "The battle was tough, but {hero} remembered the support of {friend} and found the strength to keep going, no matter how hard it got.",
        "In a final, epic confrontation, {hero} used their powers in a way they never had before, pushing themselves to the limit.",
        "Victory! {hero} had saved the day. The people of {setting} cheered for their new superhero, grateful for their bravery.",
        "From that day on, {hero} vowed to use their powers to protect {setting} and help those in need, always remembering the importance of friendship and courage.",
        "And so began the legend of {hero}, the superhero who could {power}, ready to face whatever challenges may come their way."
      ]
    },
    // You can add more story templates here
  ];