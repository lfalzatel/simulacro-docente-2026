const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'quizData.js');
const content = fs.readFileSync(filePath, 'utf8');

// Match the array content more robustly
// It starts with 'const RAW_QUIZ_DATA = {'
const match = content.match(/const\s+RAW_QUIZ_DATA\s*=\s*(\{[\s\S]*?\});/); // It is an object, not array directly

if (match) {
    try {
        const data = eval('(' + match[1] + ')');
        const categories = [...new Set(data.questions.map(q => q.category))];
        console.log(JSON.stringify(categories, null, 2));
    } catch (e) {
        console.error("Error evaluating data:", e);
    }
} else {
    console.log("Could not find RAW_QUIZ_DATA object");
}
