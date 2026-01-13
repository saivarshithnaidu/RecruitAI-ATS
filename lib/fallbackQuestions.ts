export const FALLBACK_QUESTIONS = {
    "Frontend Developer": [
        {
            question: "What is the virtual DOM in React?",
            options: ["A direct copy of the HTML DOM", "A lightweight JavaScript representation of the DOM", "A CSS processor", "A database for frontend"],
            correct_answer: "A lightweight JavaScript representation of the DOM",
            type: "mcq",
            marks: 5
        },
        {
            question: "Which hook is used for side effects in React?",
            options: ["useState", "useContext", "useEffect", "useReducer"],
            correct_answer: "useEffect",
            type: "mcq",
            marks: 5
        },
        {
            question: "What does CSS 'box-sizing: border-box' do?",
            options: ["Adds a border to the box", "Includes padding and border in the element's total width and height", "Removes the border", "Aligns the box to the border"],
            correct_answer: "Includes padding and border in the element's total width and height",
            type: "mcq",
            marks: 5
        },
        {
            question: "Explain the difference between 'let' and 'var'.",
            type: "short",
            options: null,
            correct_answer: "let is block scoped, var is function scoped.",
            marks: 10
        },
        {
            question: "HTML5 semantic question: What is the purpose of the <article> tag?",
            type: "mcq",
            options: ["To define navigation links", "To specify independent, self-contained content", "To display a footer", "To highlight text"],
            correct_answer: "To specify independent, self-contained content",
            marks: 5
        }
    ],
    "Backend Developer": [
        {
            question: "What is the purpose of REST API?",
            options: ["To style web pages", "To communicate between client and server using HTTP standard", "To manage databases", "To test code"],
            correct_answer: "To communicate between client and server using HTTP standard",
            type: "mcq",
            marks: 5
        },
        {
            question: "Which status code indicates 'Not Found'?",
            options: ["200", "404", "500", "301"],
            correct_answer: "404",
            type: "mcq",
            marks: 5
        },
        {
            question: "Explain the concept of ACID in databases.",
            type: "short",
            options: null,
            correct_answer: "Atomicity, Consistency, Isolation, Durability",
            marks: 10
        }
    ],
    "default": [
        {
            question: "Select the correct option to declare a constant in JavaScript.",
            options: ["var", "let", "const", "constant"],
            correct_answer: "const",
            type: "mcq",
            marks: 5
        },
        {
            question: "What does HTTP stand for?",
            options: ["Hyper Text Transfer Protocol", "High Transfer Text Protocol", "Hyper Tool Transfer Protocol", "Hyper Text Tool Protocol"],
            correct_answer: "Hyper Text Transfer Protocol",
            type: "mcq",
            marks: 5
        }
    ]
};
