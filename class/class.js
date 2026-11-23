class Todo {

    #id;
    #title;
    #completed;

    constructor(id, title) {
        this.#id = id;
        this.#title = title;
        this.#completed = false;
    }

    edit(newTitle) {
        if (!newTitle.trim()) {
            throw new Error("Title cannot be empty");
        }

        this.#title = newTitle;
    }

    complete() {
        this.#completed = true;
    }

    undo() {
        this.#completed = false;
    }

}
const task = new Todo(1, "Learn JavaScript");

task.edit("Learn JavaScript deeply");

task.complete();

task.undo();