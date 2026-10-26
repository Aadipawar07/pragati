export function buildQuestionPrompt({ subject, topic, mode, difficulty, count, language, weakQuestions }) {
  const modeInstruction = {
    mcq: "Create only single-answer multiple-choice questions.",
    short_answer: "Create short-answer questions requiring concise written responses.",
    long_answer: "Create structured examination-style long-answer questions.",
    conceptual: "Test conceptual understanding, not rote recall. Use short answers.",
    application: "Use practical scenarios that require applying the topic. Use short or long answers.",
    quick_quiz: "Create a concise mixed quiz using MCQ and short-answer questions.",
    topic_revision: "Create a focused revision set covering foundational and important concepts using MCQ and short-answer questions.",
    weak_area: "Target the documented historical mistakes supplied below, without claiming more weakness than the data supports. Use MCQ and short-answer questions."
  }[mode];
  return [
    "Create accurate, useful academic practice questions grounded only in the supplied subject/topic/syllabus context.",
    `Subject: ${subject.name}. Topic: ${topic.name}. Topic description: ${topic.description || "not provided"}.`,
    `Mode: ${mode}. ${modeInstruction}`,
    `Difficulty: ${difficulty}. Number of questions: exactly ${count}. Language: ${language}.`,
    "Do not claim questions are predicted or guaranteed to appear in exams. Do not include HTML, executable code, or questions unrelated to the topic.",
    "For each question provide type (mcq, short_answer, or long_answer), prompt, options as [{id,text}] (exactly 4 for MCQ, [] otherwise), correctOptionId (valid option id for MCQ, null otherwise), expectedAnswer (plain text), rubric (array of key assessment criteria), explanation (plain text), marks (integer 1-10), and topicName.",
    "Return a JSON object with a questions array and no extra prose.",
    `Historical incorrect answers for targeted practice, if any: ${JSON.stringify(weakQuestions)}`
  ].join("\n\n");
}

export function buildEvaluationPrompt({ question, answer }) {
  return [
    "Evaluate this student answer fairly against the supplied expected answer and rubric. Do not award credit for unrelated content.",
    `Question: ${question.prompt}`,
    `Expected answer: ${question.expectedAnswer}`,
    `Rubric: ${JSON.stringify(question.rubric)}`,
    `Maximum marks: ${question.marks}`,
    `Student answer: ${answer}`,
    "Return only JSON: {\"awardedMarks\":number,\"feedback\":string,\"missingConcepts\":string[],\"suggestedNextStep\":string}. Be constructive. Do not claim certainty beyond this rubric."
  ].join("\n\n");
}
