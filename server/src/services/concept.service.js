import { Profile, Subject, Syllabus, Topic, Unit } from "../models/index.js";
import { generate } from "../ai/gateway.js";
import { buildConceptPrompt } from "../prompts/concept.prompt.js";

const outputError = () => {
  const error = new Error("The AI provider returned an invalid concept explanation.");
  error.status = 502;
  error.code = "AI_INVALID_OUTPUT";
  return error;
};

export async function explainConcept(userId, input) {
  const profile = await Profile.findOne({ userId }).select("course semester preferredLanguage studyPreferences.preferredLanguages").lean();
  let syllabusContext = null;
  let sourceReferences = [];
  let syllabusAlignment = input.subjectId ? "not_matched" : "not_requested";

  if (input.subjectId) {
    const subject = await Subject.findOne({ _id: input.subjectId, userId, status: "active" }).lean();
    if (!subject) throw notFoundError("Subject not found.");
    const syllabus = await Syllabus.findOne({ _id: subject.syllabusId, userId }).select("title status").lean();
    const topicQuery = input.topicId
      ? Topic.findOne({ _id: input.topicId, userId, subjectId: subject._id, syllabusId: subject.syllabusId, status: "active" }).lean()
      : Topic.findOne({
        userId,
        subjectId: subject._id,
        syllabusId: subject.syllabusId,
        status: "active",
        name: new RegExp(`^${escapeRegex(input.concept.trim())}$`, "i")
      }).lean();
    const [topic, units] = await Promise.all([
      topicQuery,
      Unit.find({ userId, subjectId: subject._id, syllabusId: subject.syllabusId, status: "active" }).select("name").sort({ order: 1 }).limit(20).lean()
    ]);
    if (input.topicId && !topic) throw notFoundError("Topic not found.");
    let unit = null;
    if (topic?.unitId) unit = await Unit.findOne({ _id: topic.unitId, userId, subjectId: subject._id }).select("name").lean();

      const exactTopicMatch = topic && normalize(topic.name) === normalize(input.concept);
    const subjectMatch = normalize(input.concept) === normalize(subject.name);
    if (exactTopicMatch || subjectMatch) {
      syllabusAlignment = "matched";
      sourceReferences = [{
        type: "syllabus",
        subjectId: subject._id.toString(),
        subject: subject.name,
        ...(topic ? { topicId: topic._id.toString(), topic: topic.name } : {}),
        ...(unit ? { unit: unit.name } : {}),
        ...(syllabus?.title ? { syllabus: syllabus.title } : {})
      }];
    }
    syllabusContext = {
      subject: subject.name,
      subjectDescription: subject.description || null,
      syllabus: syllabus?.title || null,
      syllabusStatus: syllabus?.status || null,
      ...(syllabusAlignment === "matched" && topic ? { topic: topic.name, topicDescription: topic.description || null, unit: unit?.name || null } : {}),
      availableUnits: units.map((item) => item.name),
      alignmentNote: syllabusAlignment === "matched" ? "The requested concept matches the selected syllabus item." : "The supplied concept did not exactly match the selected subject or topic. Do not claim syllabus alignment."
    };
  }

  const language = input.language || languageCode(profile?.preferredLanguage || profile?.studyPreferences?.preferredLanguages?.[0]);
  const context = {
    ...(profile?.course ? { program: profile.course } : {}),
    ...(profile?.semester ? { semester: profile.semester } : {}),
    ...(syllabusContext ? { syllabus: syllabusContext } : {})
  };
  const mode = input.mode || "simple";
  const detailLevel = input.detailLevel || "medium";
  const includeExamples = input.includeExamples ?? mode === "example";
  const includeAnalogy = input.includeAnalogy ?? mode === "analogy";
  const includeExamAnswer = input.includeExamAnswer ?? mode === "exam";
  const schema = validateExplanation;
  const result = await generate({
    task: "concept_explanation",
    context,
    schema,
    options: {
      prompt: buildConceptPrompt({ concept: input.concept.trim(), mode, language, detailLevel, includeExamples, includeAnalogy, includeExamAnswer, context }),
      timeoutMs: 30000
    },
    userId
  });
  const explanation = {
    ...result.structuredData,
    concept: input.concept.trim(),
    mode,
    language,
    syllabusAlignment,
    sourceReferences
  };
  if (!includeExamples) explanation.examples = [];
  if (!includeAnalogy) explanation.analogy = null;
  if (!includeExamAnswer) explanation.examAnswer = null;
  if (mode !== "diagram") explanation.diagram = null;
  return explanation;
}

function validateExplanation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw outputError();
  if (!validText(value.summary, 1200) || !Array.isArray(value.explanation) || value.explanation.length < 1 || value.explanation.length > 8) throw outputError();
  const explanation = value.explanation.map((section) => {
    if (!section || !validText(section.heading, 160) || !validText(section.content, 2500)) throw outputError();
    return { heading: section.heading, content: section.content };
  });
  const keyPoints = textList(value.keyPoints, 12, 500);
  const examples = textList(value.examples, 8, 1200);
  const commonMistakes = textList(value.commonMistakes, 8, 500);
  const quickRevision = textList(value.quickRevision, 12, 500);
  let analogy = null;
  if (value.analogy !== null && value.analogy !== undefined) {
    if (!validText(value.analogy?.description, 1200) || !validText(value.analogy?.limitations, 800)) throw outputError();
    analogy = { description: value.analogy.description, limitations: value.analogy.limitations };
  }
  const examAnswer = value.examAnswer === null || value.examAnswer === undefined ? null : validText(value.examAnswer, 5000) ? value.examAnswer : (() => { throw outputError(); })();
  let diagram = null;
  if (value.diagram !== null && value.diagram !== undefined) {
    const nodes = value.diagram.nodes;
    const edges = value.diagram.edges;
    if (!Array.isArray(nodes) || nodes.length < 1 || nodes.length > 12 || !Array.isArray(edges) || edges.length > 20) throw outputError();
    const ids = new Set();
    diagram = {
      nodes: nodes.map((node) => {
        if (!node || !validText(node.id, 40) || !validText(node.label, 100) || ids.has(node.id)) throw outputError();
        ids.add(node.id);
        return { id: node.id, label: node.label };
      }),
      edges: edges.map((edge) => {
        if (!edge || !validText(edge.from, 40) || !validText(edge.to, 40) || !validText(edge.label, 100)) throw outputError();
        return { from: edge.from, to: edge.to, label: edge.label };
      })
    };
    if (diagram.edges.some((edge) => !ids.has(edge.from) || !ids.has(edge.to))) throw outputError();
  }
  return { summary: value.summary, explanation, keyPoints, examples, analogy, examAnswer, commonMistakes, quickRevision, diagram };
}

function textList(value, maximumItems, maximumLength) {
  if (!Array.isArray(value) || value.length > maximumItems || value.some((item) => !validText(item, maximumLength))) throw outputError();
  return value;
}

function validText(value, maximumLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximumLength;
}

function languageCode(value = "") {
  const language = value.toLowerCase();
  if (language.startsWith("marathi") || language === "mr") return "mr";
  if (language.startsWith("hindi") || language === "hi") return "hi";
  return "en";
}

function normalize(value) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function notFoundError(message) {
  const error = new Error(message);
  error.status = 404;
  error.code = "SYLLABUS_ITEM_NOT_FOUND";
  return error;
}
