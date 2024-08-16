let currentWord = 0;

// Questions for the story
const questions = [
    "What's the name of your superhero?",
    "What special power does your superhero have?",
    "Where does your superhero live?",
    "Who is your superhero's best friend?",
    "What's the biggest problem your superhero needs to solve?"
];

let currentQuestionIndex = 0;
let storyElements = {};
let currentPageIndex = 0;
let storyPages = [];

// DOM elements
const questionDisplay = document.getElementById('question-display');
const userInput = document.getElementById('user-input');
const submitButton = document.getElementById('submit-answer');
const questionArea = document.getElementById('question-area');
const storyDisplay = document.getElementById('story-display');
const storyContent = document.getElementById('story-content');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');

// Speech synthesis setup
let speechSynthesis = window.speechSynthesis;
let speechUtterance = new SpeechSynthesisUtterance();

// Speech recognition setup
let recognition;
let isListening = false;
try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        // Speech recognition event handlers
        recognition.onresult = function(event) {
            let last = event.results.length - 1;
            let text = event.results[last][0].transcript;
            
            if (isSpeaking) {
                handleInterruption(text);
            } else {
                userInput.value = text;
                handleAnswer();
            }
        };

        recognition.onend = function() {
            isListening = false;
        };
    } else {
        console.log("Speech recognition not supported in this browser.");
    }
} catch (e) {
    console.error("Error setting up speech recognition:", e);
}

let isSpeaking = false;

const placeholderMapping = {
    "What's the name of your superhero?": "hero",
    "What special power does your superhero have?": "power",
    "Where does your superhero live?": "setting",
    "Who is your superhero's best friend?": "friend",
    "What's the biggest problem your superhero needs to solve?": "problem"
};

function displayQuestion() {
    if (currentQuestionIndex < questions.length) {
        questionDisplay.textContent = questions[currentQuestionIndex];
        speak(questions[currentQuestionIndex], true);
    } else {
        generateStory();
    }
}

function handleAnswer() {
    const answer = userInput.value.trim();
    if (answer) {
        storyElements[questions[currentQuestionIndex]] = answer;
        currentQuestionIndex++;
        userInput.value = '';
        displayQuestion();
    }
}

function speak(text, isQuestion = false) {
    if (!text) {
        console.error("No text provided to speak function");
        return;
    }

    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    let words = text.split(' ');
    currentWord = 0;

    speechUtterance.text = text;
    speechUtterance.rate = parseFloat(document.getElementById('speech-rate').value);
    speechUtterance.onboundary = function(event) {
        if (event.name === 'word') {
            updateHighlight();
        }
    };
    speechUtterance.onstart = function() {
        isSpeaking = true;
    };
    speechUtterance.onend = function() {
        isSpeaking = false;
        clearHighlights();
        if (!isQuestion) {
            setTimeout(() => {
                currentPageIndex++;
                if (currentPageIndex < storyPages.length) {
                    showPage(currentPageIndex);
                    speak(storyPages[currentPageIndex].textContent);
                }
            }, 3000); // 3 second pause before next page
        }
    };

    if (isQuestion) {
        questionDisplay.innerHTML = words.map((word, index) => 
            `<span id="word-${index}">${word}</span>`
        ).join(' ');
    } else {
        let pageContent = document.querySelector('.story-page:not([style*="display: none"]) p');
        if (pageContent) {
            pageContent.innerHTML = words.map((word, index) => 
                `<span id="word-${index}">${word}</span>`
            ).join(' ');
        }
    }

    speechSynthesis.speak(speechUtterance);
}

function updateHighlight() {
    clearHighlights();
    let wordToHighlight = document.getElementById(`word-${currentWord}`);
    if (wordToHighlight) {
        wordToHighlight.classList.add('highlight');
    }
    currentWord++;
}

function clearHighlights() {
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
}

function stopSpeaking() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
}

function toggleListening() {
    if (!recognition) {
        console.log("Speech recognition is not available.");
        return;
    }
    if (isListening) {
        recognition.stop();
        isListening = false;
    } else {
        if (isSpeaking) {
            stopSpeaking();
        }
        recognition.start();
        isListening = true;
    }
}

function handleInterruption(text) {
    if (text.toLowerCase().includes('what is') || text.toLowerCase().includes('who is')) {
        speak("I'm sorry, I don't have enough information to answer that question. Let's continue with the story.");
    } else if (text.toLowerCase().includes('change') || text.toLowerCase().includes('modify')) {
        speak("I understand you want to make a change. Let's go back to the questions so you can modify the story elements.");
        currentQuestionIndex = 0;
        questionArea.style.display = 'block';
        storyDisplay.style.display = 'none';
        displayQuestion();
    } else {
        speak("I'm not sure how to handle that. Let's continue with the story.");
    }
}

function generateImage(prompt) {
    // Instead of using Unsplash, we'll use a local placeholder
    return `https://via.placeholder.com/300x200?text=${encodeURIComponent(prompt)}`;
}

const storyTemplates = [
    {
        title: "The Hero's Journey",
        pages: [
            "In the peaceful city of {setting}, lived an ordinary person named {hero}. Little did they know, their life was about to change forever.",
            "One day, {hero} discovered they had the incredible power to {power}. At first, they were scared and confused.",
            "With the help of their loyal friend {friend}, {hero} learned to control their new abilities.",
            "But trouble was brewing. A great challenge appeared: {problem}. The city needed a hero!",
            "{hero} knew they had to act. Using their power to {power}, they faced the challenge head-on.",
            "The battle was tough, but {hero} remembered the support of {friend} and found the strength to continue.",
            "In a final, epic confrontation, {hero} used their powers in a way they never had before.",
            "Victory! {hero} had saved the day. The city celebrated their new superhero.",
            "From that day on, {hero} vowed to use their powers to protect {setting} and help those in need.",
            "And so began the legend of {hero}, the superhero who could {power}."
        ]
    },
    // Add more templates here
];

function generateAdvancedStory() {
    const template = storyTemplates[Math.floor(Math.random() * storyTemplates.length)];
    let storyHTML = `<h2>${template.title}</h2>`;
    
    storyPages = template.pages.map((page, index) => {
        let pageContent = page;
        for (let [question, answer] of Object.entries(storyElements)) {
            const placeholder = placeholderMapping[question];
            if (placeholder) {
                pageContent = pageContent.replace(new RegExp(`{${placeholder}}`, 'g'), answer);
            }
        }
        
        return {
            html: `
                <div class="story-page" id="page-${index}">
                    <img src="${generateImage(pageContent)}" alt="Story illustration">
                    <p>${pageContent}</p>
                </div>
            `,
            textContent: pageContent
        };
    });
    
    storyContent.innerHTML = storyHTML + storyPages.map(page => page.html).join('');
    questionArea.style.display = 'none';
    storyDisplay.style.display = 'block';
    currentPageIndex = 0;
    showPage(currentPageIndex);
    speak(storyPages[currentPageIndex].textContent);
}

function showPage(pageNumber) {
    const pages = document.querySelectorAll('.story-page');
    pages.forEach(page => page.style.display = 'none');
    const pageToShow = document.getElementById(`page-${pageNumber}`);
    if (pageToShow) {
        pageToShow.style.display = 'block';
        currentPageIndex = pageNumber;
        
        // Wrap words in spans for the newly displayed page
        let pageContent = pageToShow.querySelector('p');
        if (pageContent) {
            let words = pageContent.textContent.split(' ');
            pageContent.innerHTML = words.map((word, index) => 
                `<span id="word-${index}">${word}</span>`
            ).join(' ');
        }
    }
    updatePageButtons();
}

function updatePageButtons() {
    const pages = document.querySelectorAll('.story-page');
    prevPageButton.disabled = currentPageIndex === 0;
    nextPageButton.disabled = currentPageIndex === pages.length - 1;
}

// Event listeners
submitButton.addEventListener('click', handleAnswer);
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleAnswer();
    }
});

document.getElementById('voice-input-btn').addEventListener('click', toggleListening);

document.getElementById('speech-rate').addEventListener('change', (e) => {
    speechUtterance.rate = e.target.value;
});

document.getElementById('speech-volume').addEventListener('change', (e) => {
    speechUtterance.volume = e.target.value;
});

prevPageButton.addEventListener('click', () => {
    if (currentPageIndex > 0) {
        stopSpeaking();
        showPage(currentPageIndex - 1);
        speak(storyPages[currentPageIndex].textContent);
    }
});

nextPageButton.addEventListener('click', () => {
    if (currentPageIndex < storyPages.length - 1) {
        stopSpeaking();
        showPage(currentPageIndex + 1);
        speak(storyPages[currentPageIndex].textContent);
    }
});

function saveStory() {
    const story = {
        title: `The Amazing Adventures of ${storyElements[questions[0]]}`,
        content: storyContent.innerHTML,
        elements: storyElements
    };
    
    let savedStories = JSON.parse(localStorage.getItem('savedStories')) || [];
    savedStories.push(story);
    localStorage.setItem('savedStories', JSON.stringify(savedStories));
    
    alert('Story saved successfully!');
}

function loadStories() {
    const savedStories = JSON.parse(localStorage.getItem('savedStories')) || [];
    const storyList = document.createElement('ul');
    
    savedStories.forEach((story, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = story.title;
        listItem.addEventListener('click', () => loadStory(index));
        storyList.appendChild(listItem);
    });
    
    storyContent.innerHTML = '';
    storyContent.appendChild(storyList);
}

function loadStory(index) {
    const savedStories = JSON.parse(localStorage.getItem('savedStories')) || [];
    const story = savedStories[index];
    
    if (story) {
        storyElements = story.elements;
        storyContent.innerHTML = story.content;
        showPage(0);
        speak("Here's your saved story: " + storyContent.textContent);
    }
}

document.getElementById('save-story').addEventListener('click', saveStory);
document.getElementById('load-stories').addEventListener('click', loadStories);

// Initialize the first question
displayQuestion();

// Define generateStory after all functions are declared
const generateStory = generateAdvancedStory;