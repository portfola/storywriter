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

const questionDisplay = document.getElementById('question-display');
const userInput = document.getElementById('user-input');
const submitButton = document.getElementById('submit-answer');
const questionArea = document.getElementById('question-area');
const storyDisplay = document.getElementById('story-display');
const storyContent = document.getElementById('story-content');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');

function displayQuestion() {
    if (currentQuestionIndex < questions.length) {
        questionDisplay.textContent = questions[currentQuestionIndex];
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
    
    // This is a very basic story generation. In a real application, you'd use an LLM here.
    const story = `
        <h2>The Amazing Adventures of ${storyElements[questions[0]]}</h2>
        <p>In a world where anything is possible, there lived a superhero named ${storyElements[questions[0]]}. 
        This hero had the incredible power to ${storyElements[questions[1]]}.</p>
        <p>${storyElements[questions[0]]} lived in ${storyElements[questions[2]]}, always ready to save the day. 
        With the help of their best friend, ${storyElements[questions[3]]}, no challenge was too great.</p>
        <p>One day, they faced their biggest problem yet: ${storyElements[questions[4]]}. 
        But with courage, friendship, and their amazing powers, they knew they could overcome anything!</p>
    `;
    
    storyContent.innerHTML = story;
}

submitButton.addEventListener('click', handleAnswer);
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleAnswer();
    }
});

// Initialize the first question
displayQuestion();

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
