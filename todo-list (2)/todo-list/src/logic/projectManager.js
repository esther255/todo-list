import Project from "./project.js";

export const DEFAULT_PROJECT_NAME = "My project";

/**
 * Owns every project. There is always a default project (the first one),
 * it can't be deleted, and new todos go there unless another project is chosen.
 */
export default class ProjectManager {
  #projects;

  constructor(projects = []) {
    this.#projects = [...projects];
    if (this.#projects.length === 0) this.#projects.push(new Project(DEFAULT_PROJECT_NAME));
  }

  get defaultProject() {
    return this.#projects[0];
  }

  getProjects() {
    return [...this.#projects];
  }

  getProject(id) {
    const project = this.#projects.find((p) => p.id === id);
    if (!project) throw new Error(`No project found with id "${id}".`);
    return project;
  }

  createProject(name) {
    const project = new Project(name);
    const taken = this.#projects.some((p) => p.name.toLowerCase() === project.name.toLowerCase());
    if (taken) throw new Error(`A project called "${project.name}" already exists.`);
    this.#projects.push(project);
    return project;
  }

  removeProject(id) {
    const project = this.getProject(id);
    if (project === this.defaultProject) throw new Error("The default project can't be deleted.");
    this.#projects = this.#projects.filter((p) => p !== project);
    return project;
  }

  addTodo(projectId = this.defaultProject.id, data) {
    return this.getProject(projectId).addTodo(data);
  }

  /** Find a todo in any project: { project, todo }, or null if it no longer exists. */
  findTodo(todoId) {
    for (const project of this.#projects) {
      const todo = project.getTodos().find((t) => t.id === todoId);
      if (todo) return { project, todo };
    }
    return null;
  }

  removeTodo(projectId, todoId) {
    return this.getProject(projectId).removeTodo(todoId);
  }

  moveTodo(todoId, fromProjectId, toProjectId) {
    if (fromProjectId === toProjectId) return;
    const destination = this.getProject(toProjectId); // check this first so nothing is lost
    destination.receive(this.getProject(fromProjectId).removeTodo(todoId));
  }

  toJSON() {
    return this.#projects.map((p) => p.toJSON());
  }

  static fromJSON(data) {
    const projects = (Array.isArray(data) ? data : []).flatMap((item) => {
      try {
        return [Project.fromJSON(item)];
      } catch {
        return [];
      }
    });
    return new ProjectManager(projects);
  }
}
