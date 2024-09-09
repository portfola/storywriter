// src/data/storyData.js

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
  
  export const storyTemplates = [
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
    {
      title: "A New Guardian Rises",
      pages: [
        "In a world much like our own, there was a special place called {setting}. It was here that our story's hero, {hero}, lived a seemingly ordinary life.",
        "Everything changed when {hero} discovered an amazing secret: they had the power to {power}. This discovery filled them with wonder and a little bit of fear.",
        "{hero} didn't know what to do with this new ability, but thankfully, they had a wonderful friend named {friend} to confide in.",
        "As {hero} was learning about their powers, a shadow fell over {setting}. A great threat emerged: {problem}. People were scared and didn't know what to do.",
        "With encouragement from {friend}, {hero} realized that they had the power to help. They decided to use their ability to {power} to protect their home.",
        "The path wasn't easy. {hero} faced many challenges and sometimes felt like giving up. But the thought of {setting} in danger kept them going.",
        "In the most difficult moment, when all seemed lost, {hero} found a new way to use their power. It was risky, but it was their only hope.",
        "Against all odds, {hero} succeeded! The threat was defeated, and {setting} was saved. Everyone celebrated their new hero.",
        "{hero} had learned so much about bravery, friendship, and the responsibility that comes with great power. They promised to always be there when {setting} needed them.",
        "And so, {hero} became the guardian of {setting}, ready to {power} whenever danger threatened, a beacon of hope for all."
      ]
    }
  ];