/**
 * Form rules as pure functions: each returns an error message, or "" when the
 * value is fine. No DOM in here. The DOM layer feeds these results into the
 * Constraint Validation API (setCustomValidity) and shows them under the field.
 */

export const LIMITS = {
  title: { min: 3, max: 80 },
  description: { max: 300 },
  notes: { max: 500 },
  subtask: { max: 60 },
  projectName: { min: 2, max: 30 },
  assignees: { max: 4 },
};

function lengthProblem(value, label, { min = 0, max = Infinity }) {
  const length = value.trim().length;
  if (length > 0 && length < min) return `${label} needs at least ${min} characters.`;
  if (length > max) return `${label} can be at most ${max} characters (it is ${length}).`;
  return "";
}

const onlySpaces = (value) => value.length > 0 && value.trim() === "";

export function titleProblem(value) {
  if (onlySpaces(value)) return "The title can't be only spaces.";
  return lengthProblem(value, "The title", LIMITS.title);
}

export const descriptionProblem = (value) =>
  lengthProblem(value, "The description", LIMITS.description);

export const notesProblem = (value) => lengthProblem(value, "The notes", LIMITS.notes);

export const subtaskProblem = (value) => lengthProblem(value, "A subtask", LIMITS.subtask);

export function assigneesProblem(value) {
  const people = value.split(/[,\s]+/).filter(Boolean);
  if (people.some((person) => !/^[A-Za-z]{1,3}$/.test(person))) {
    return "Use 1–3 letters per person, separated by commas, e.g. JD, MC.";
  }
  if (new Set(people.map((p) => p.toUpperCase())).size > LIMITS.assignees.max) {
    return `You can assign at most ${LIMITS.assignees.max} people.`;
  }
  return "";
}

export function projectNameProblem(value, existingNames = []) {
  if (onlySpaces(value)) return "The project name can't be only spaces.";
  const tooLongOrShort = lengthProblem(value, "The project name", LIMITS.projectName);
  if (tooLongOrShort) return tooLongOrShort;
  const name = value.trim().toLowerCase();
  if (name && existingNames.some((existing) => existing.toLowerCase() === name)) {
    return `A project called "${value.trim()}" already exists.`;
  }
  return "";
}
