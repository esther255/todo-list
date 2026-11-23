class Book {
    constructor(title, author, pages) {
        this.title = title;
        this.author = author;
        this.pages = pages;
        this.read = false;
    }

    describe() {
        return `${this.title} by ${this.author}`;
    }
}const book1 = new Book("Harry Potter", "J.K. Rowling", 350);

const book2 = new Book("Things Fall Apart", "Chinua Achebe", 209);
// 2practice
class Book {
    constructor(title) {
        this.title = title;
        console.log("A new book was created!");
    }
}

const book1 = new Book("Harry Potter");