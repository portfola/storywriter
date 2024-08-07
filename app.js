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
let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.lang = 'en-US';

let isListening = false;

function displayQuestion() {
    if (currentQuestionIndex < questions.length) {
        questionDisplay.textContent = questions[currentQuestionIndex];
        speak(questions[currentQuestionIndex]);
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

function generateStory() {
    questionArea.style.display = 'none';
    storyDisplay.style.display = 'block';
    
    const storyHTML = `
        <h2>The Amazing Adventures of ${storyElements[questions[0]]}</h2>
        <img src="${generateImage(storyElements[questions[0]])}" alt="Superhero">
        <p>In a world where anything is possible, there lived a superhero named ${storyElements[questions[0]]}. 
        This hero had the incredible power to ${storyElements[questions[1]]}.</p>
        <img src="${generateImage(storyElements[questions[1]])}" alt="Superpower">
        <p>${storyElements[questions[0]]} lived in ${storyElements[questions[2]]}, always ready to save the day. 
        With the help of their best friend, ${storyElements[questions[3]]}, no challenge was too great.</p>
        <img src="${generateImage(storyElements[questions[2]])}" alt="Superhero's home">
        <p>One day, they faced their biggest problem yet: ${storyElements[questions[4]]}. 
        But with courage, friendship, and their amazing powers, they knew they could overcome anything!</p>
        <img src="${generateImage(storyElements[questions[4]])}" alt="Superhero's challenge">
    `;
    
    storyContent.innerHTML = storyHTML;
    speak("Here's your story: " + storyContent.textContent);
}

function speak(text) {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    let words = text.split(' ');
    let currentWord = 0;

    speechUtterance.text = text;
    speechUtterance.onboundary = function(event) {
        if (event.name === 'word') {
            if (currentWord > 0) {
                document.getElementById(`word-${currentWord - 1}`).classList.remove('highlight');
            }
            document.getElementById(`word-${currentWord}`).classList.add('highlight');
            currentWord++;
        }
    };
    speechUtterance.onend = function() {
        document.getElementById(`word-${currentWord - 1}`).classList.remove('highlight');
    };

    // Wrap each word in a span for highlighting
    storyContent.innerHTML = words.map((word, index) => 
        `<span id="word-${index}">${word}</span>`
    ).join(' ');

    speechSynthesis.speak(speechUtterance);
}

function stopSpeaking() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
}

function toggleListening() {
    if (isListening) {
        recognition.stop();
        isListening = false;
    } else {
        recognition.start();
        isListening = true;
    }
}

function generateImage(prompt) {
    // In a real implementation, this would call an image generation API
    // For now, we'll use a placeholder image service
    return `https://via.placeholder.com/300x200?text=${encodeURIComponent(prompt)}`;
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

// Speech recognition event handlers
recognition.onresult = function(event) {
    let last = event.results.length - 1;
    let text = event.results[last][0].transcript;
    userInput.value = text;
    handleAnswer();
};

recognition.onend = function() {
    isListening = false;
};

// Placeholder for page turning functionality
let currentPage = 0;
prevPageButton.addEventListener('click', () => {
    if (currentPage > 0) currentPage--;
    // Update story display based on current page
});
nextPageButton.addEventListener('click', () => {
    currentPage++;
    // Update story display based on current page
});

// Initialize the first question
displayQuestion();
