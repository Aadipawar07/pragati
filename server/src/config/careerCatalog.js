export const CAREER_CATALOG_VERSION = "pragati-configured-guidance-v1";

const skill = (id, name, category, description, action, measurement) => ({
  id, name, category, description, action, measurement
});

const skills = {
  "web-fundamentals": skill("web-fundamentals", "Web fundamentals", "Foundations", "HTML, CSS, browser behavior, and accessible page structure.", "Build and refine a responsive page with semantic HTML and accessible controls.", "A working responsive page with keyboard-accessible interactions."),
  javascript: skill("javascript", "JavaScript", "Programming", "JavaScript language fundamentals and browser-side programming.", "Practise functions, data structures, asynchronous code, and DOM interactions.", "A small application with validated input and clear state changes."),
  react: skill("react", "React", "Frontend", "Component-based UI development with state and effects.", "Build a multi-view interface using reusable components and managed state.", "A working interface with reusable components and tested key flows."),
  "api-integration": skill("api-integration", "API integration", "Frontend", "Connecting a user interface to documented HTTP APIs.", "Connect a UI to an API and handle loading, empty, and error states.", "A user flow that reads and updates server-backed data."),
  "full-stack-integration": skill("full-stack-integration", "Full-stack integration", "Engineering", "Connecting a user interface, server behavior, and persisted data.", "Trace one user flow from the interface through a validated API to persisted data.", "A documented end-to-end flow with tested error handling."),
  "server-programming": skill("server-programming", "Server programming", "Backend", "Building server-side application behavior and HTTP endpoints.", "Implement a small authenticated API with validated inputs.", "Endpoints with input validation and clear error responses."),
  databases: skill("databases", "Database design", "Backend", "Modeling data and implementing safe persistence.", "Design a small relational or document data model and implement core queries.", "A documented schema with tested create, read, update, and ownership behavior."),
  authentication: skill("authentication", "Authentication and authorization", "Backend", "Protecting application resources and enforcing ownership.", "Add authenticated routes with per-user authorization checks.", "Tests show authenticated access and rejection of cross-user access."),
  testing: skill("testing", "Software testing", "Engineering", "Testing important behavior and failure cases.", "Write focused unit and API tests for core behavior and invalid inputs.", "Automated tests cover expected behavior and at least one failure case."),
  spreadsheets: skill("spreadsheets", "Spreadsheet analysis", "Analysis", "Organizing, cleaning, and analyzing tabular data.", "Clean a small dataset and produce a documented summary using spreadsheet tools.", "A reproducible workbook with cleaned data and explained results."),
  sql: skill("sql", "SQL querying", "Analysis", "Retrieving and transforming structured data with SQL.", "Answer a set of questions using joins, grouping, and filtering on a sample dataset.", "Queries return checked results for documented questions."),
  visualization: skill("data-visualization", "Data visualization", "Analysis", "Presenting data with appropriate charts and clear context.", "Create a small dashboard with labeled charts and a concise explanation.", "Charts have clear labels, source context, and a written interpretation."),
  "data-communication": skill("data-communication", "Analytical communication", "Communication", "Explaining analytical findings, limitations, and assumptions.", "Write a short evidence-based summary of an analysis and its limitations.", "A reader can identify the finding, evidence, and limitations."),
  "security-fundamentals": skill("security-fundamentals", "Security fundamentals", "Security", "Core security concepts, safe configuration, and threat awareness.", "Review a small application for common security design issues using a defensive checklist.", "A documented review identifies risks and safe mitigations."),
  "network-fundamentals": skill("network-fundamentals", "Network fundamentals", "Security", "Understanding network protocols and basic traffic flows.", "Explain a simple client-server exchange and inspect a safe local example.", "A diagram and explanation correctly describe the observed flow."),
  "secure-coding": skill("secure-coding", "Secure coding", "Security", "Applying input validation, access control, and safe error handling.", "Harden a small application route with validation and ownership checks.", "Tests demonstrate rejected invalid input and unauthorized access.")
};

const requirement = (skillId, importance = "core") => ({ skillId, importance, prerequisites: [] });

export const careerPaths = [
  {
    id: "frontend-developer",
    title: "Frontend Developer",
    category: "Software development",
    description: "Configured learning guidance for building accessible, interactive web interfaces.",
    skills: [requirement("web-fundamentals"), requirement("javascript"), requirement("react"), requirement("api-integration", "supporting"), requirement("testing", "supporting")]
  },
  {
    id: "backend-developer",
    title: "Backend Developer",
    category: "Software development",
    description: "Configured learning guidance for server-side application development and data access.",
    skills: [requirement("server-programming"), requirement("databases"), requirement("authentication"), requirement("testing", "supporting"), requirement("javascript", "supporting")]
  },
  {
    id: "full-stack-developer",
    title: "Full Stack Developer",
    category: "Software development",
    description: "Configured learning guidance for connecting browser interfaces, server logic, and persisted data.",
    skills: [requirement("web-fundamentals"), requirement("javascript"), requirement("react"), requirement("server-programming"), requirement("databases"), requirement("full-stack-integration", "supporting"), requirement("testing", "supporting")]
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    category: "Data",
    description: "Configured learning guidance for querying, analyzing, visualizing, and communicating data.",
    skills: [requirement("spreadsheets"), requirement("sql"), requirement("data-visualization"), requirement("data-communication")]
  },
  {
    id: "cybersecurity-analyst",
    title: "Cybersecurity Analyst",
    category: "Security",
    description: "Configured defensive learning guidance for security and network fundamentals.",
    skills: [requirement("security-fundamentals"), requirement("network-fundamentals"), requirement("secure-coding", "supporting"), requirement("testing", "supporting")]
  }
];

export const careerProjects = {
  "frontend-developer": [{
    id: "accessible-task-board",
    title: "Accessible task board",
    problem: "Create an interface that helps a user organize and update a small set of tasks.",
    skillIds: ["web-fundamentals", "javascript", "react", "api-integration"],
    deliverables: ["Responsive task-board interface", "Accessible keyboard interactions", "Documented data flow and error states"],
    completionCriteria: "A user can create, update, and filter tasks across screen sizes, with keyboard access and visible loading/error handling.",
    rationale: "This project combines the configured interface, programming, and API skills for this goal.",
    level: "beginner"
  }],
  "backend-developer": [{
    id: "secure-booking-api",
    title: "Secure booking API",
    problem: "Build an API that stores bookings and exposes user-owned records safely.",
    skillIds: ["server-programming", "databases", "authentication", "testing"],
    deliverables: ["Documented API endpoints", "Data model and migrations or schema notes", "Tests for validation and ownership"],
    completionCriteria: "Authenticated users can manage only their own records, and automated tests cover valid and rejected requests.",
    rationale: "This project exercises the server, data, authorization, and testing skills in this configured path.",
    level: "intermediate"
  }],
  "full-stack-developer": [{
    id: "full-stack-study-planner",
    title: "Full-stack study planner",
    problem: "Build a small planner where a student can create and update their own study tasks.",
    skillIds: ["web-fundamentals", "javascript", "react", "server-programming", "databases", "full-stack-integration", "testing"],
    deliverables: ["Responsive task interface", "Validated server endpoints and data model", "Tests for user-owned task operations", "Short end-to-end flow explanation"],
    completionCriteria: "A user can create and update their own tasks, another user cannot access them, and the main flow has an automated test.",
    rationale: "This project connects the configured interface, server, data, and integration skills for the selected full-stack path.",
    level: "beginner"
  }],
  "data-analyst": [{
    id: "transparent-data-report",
    title: "Transparent data report",
    problem: "Answer a practical question using a small, clearly sourced dataset.",
    skillIds: ["spreadsheets", "sql", "data-visualization", "data-communication"],
    deliverables: ["Cleaned dataset and query/workbook", "Labeled visualization", "Short findings and limitations report"],
    completionCriteria: "Another reader can reproduce the analysis and distinguish observed findings from assumptions.",
    rationale: "This project joins the configured analysis and communication skills in this path.",
    level: "beginner"
  }],
  "cybersecurity-analyst": [{
    id: "defensive-application-review",
    title: "Defensive application review",
    problem: "Review a local sample application and document security risks with safe mitigations.",
    skillIds: ["security-fundamentals", "network-fundamentals", "secure-coding", "testing"],
    deliverables: ["Threat and data-flow notes", "Defensive findings with mitigations", "Tests for selected protective controls"],
    completionCriteria: "The report explains each finding, its evidence, and a defensive mitigation without testing third-party systems.",
    rationale: "This controlled local exercise connects the configured security, network, coding, and testing skills.",
    level: "intermediate"
  }]
};

export function getCareerPath(pathId) {
  return careerPaths.find((path) => path.id === pathId) || null;
}

export function getCareerSkill(skillId) {
  return skills[skillId] || null;
}

export function getCareerPathDTO(path) {
  return {
    id: path.id,
    title: path.title,
    category: path.category,
    description: path.description,
    version: CAREER_CATALOG_VERSION,
    provenance: "Pragati-configured educational guidance; not an official industry standard or live labor-market source.",
    skills: path.skills.map((item, index) => ({
      ...getCareerSkill(item.skillId),
      importance: item.importance,
      prerequisites: item.prerequisites,
      order: index + 1
    }))
  };
}
