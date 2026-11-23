import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assigneesProblem,
  descriptionProblem,
  notesProblem,
  projectNameProblem,
  subtaskProblem,
  titleProblem,
} from "../src/logic/validation.js";

test("titleProblem: fine, too short, too long, only spaces", () => {
  assert.equal(titleProblem("Write the report"), "");
  assert.equal(titleProblem(""), ""); // "required" is checked by the browser's valueMissing
  assert.match(titleProblem("ab"), /at least 3/);
  assert.match(titleProblem("x".repeat(81)), /at most 80/);
  assert.match(titleProblem("     "), /only spaces/);
});

test("length limits for description, notes and subtasks", () => {
  assert.equal(descriptionProblem("x".repeat(300)), "");
  assert.match(descriptionProblem("x".repeat(301)), /at most 300/);
  assert.match(notesProblem("x".repeat(501)), /at most 500/);
  assert.match(subtaskProblem("x".repeat(61)), /at most 60/);
  assert.equal(subtaskProblem(""), "");
});

test("assigneesProblem accepts initials and rejects everything else", () => {
  assert.equal(assigneesProblem(""), "");
  assert.equal(assigneesProblem("JD, MC"), "");
  assert.equal(assigneesProblem("jd mc"), "");
  assert.match(assigneesProblem("JDMC"), /1–3 letters/);
  assert.match(assigneesProblem("J1"), /1–3 letters/);
  assert.match(assigneesProblem("AA, BB, CC, DD, EE"), /at most 4/);
  assert.equal(assigneesProblem("AA, aa, BB"), ""); // duplicates count once
});

test("projectNameProblem: length, spaces and duplicates (ignoring case)", () => {
  assert.equal(projectNameProblem("Gym", ["My project"]), "");
  assert.equal(projectNameProblem(""), "");
  assert.match(projectNameProblem("A"), /at least 2/);
  assert.match(projectNameProblem("x".repeat(31)), /at most 30/);
  assert.match(projectNameProblem("   "), /only spaces/);
  assert.match(projectNameProblem("my PROJECT", ["My project"]), /already exists/);
});
