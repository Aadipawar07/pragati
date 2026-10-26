import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { authService } from "@/services/auth";

const STORAGE_KEY = "pragati.student-state";

export const initialStudentContext = {
  academic: {
    college: "",
    course: "",
    year: "",
    semester: "",
    subjects: [],
  },
  study: {
    hoursPerDay: 2,
    daysPerWeek: 5,
    preferredLanguages: ["English"],
    learningPreferences: ["Practicing"],
  },
  goal: {
    primaryGoal: "",
    focusAreas: [],
  },
  career: {
    interestedField: "",
    targetRole: "",
    skillLevel: "",
  },
};

const initialState = {
  studentContext: initialStudentContext,
  flags: {
    authenticated: false,
    onboardingComplete: false,
  },
  user: null,
  authReady: false,
};

function mergeState(saved) {
  return {
    ...initialState,
    ...saved,
    authReady: false,
    studentContext: {
      ...initialState.studentContext,
      ...(saved?.studentContext || {}),
      academic: { ...initialState.studentContext.academic, ...(saved?.studentContext?.academic || {}) },
      study: { ...initialState.studentContext.study, ...(saved?.studentContext?.study || {}) },
      goal: { ...initialState.studentContext.goal, ...(saved?.studentContext?.goal || {}) },
      career: { ...initialState.studentContext.career, ...(saved?.studentContext?.career || {}) },
    },
    flags: { ...initialState.flags, ...(saved?.flags || {}) },
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONTEXT":
      return { ...state, studentContext: mergeState({ studentContext: action.payload }).studentContext };
    case "SET_FLAGS":
      return { ...state, flags: { ...state.flags, ...action.payload } };
    case "SET_AUTHENTICATED":
      return { ...state, flags: { ...state.flags, authenticated: action.payload } };
    case "SET_AUTH":
      return { ...state, user: action.payload, flags: { ...state.flags, authenticated: Boolean(action.payload) }, authReady: true };
    case "RESET":
      return { ...initialState, authReady: true };
    default:
      return state;
  }
}

const StudentContext = createContext(null);

export function StudentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? mergeState(JSON.parse(saved)) : initialState;
    } catch {
      return initialState;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    let active = true;
    authService.getCurrentUser()
      .then((user) => { if (active) dispatch({ type: "SET_AUTH", payload: user }); })
      .catch(() => {
        authService.signOut();
        if (active) dispatch({ type: "SET_AUTH", payload: null });
      });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    ...state,
    setStudentContext: (studentContext) => dispatch({ type: "SET_CONTEXT", payload: studentContext }),
    setFlags: (flags) => dispatch({ type: "SET_FLAGS", payload: flags }),
    setAuthenticated: (value) => dispatch({ type: "SET_AUTHENTICATED", payload: value }),
    setUser: (user) => dispatch({ type: "SET_AUTH", payload: user }),
    signOut: () => { authService.signOut(); dispatch({ type: "SET_AUTH", payload: null }); },
    resetStudentState: () => dispatch({ type: "RESET" }),
  }), [state]);

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudent() {
  const context = useContext(StudentContext);
  if (!context) throw new Error("useStudent must be used inside StudentProvider");
  return context;
}
