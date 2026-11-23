function Student(name, course) {
  this.name = name;
  this.course = course;

  this.introduce = function () {
    console.log("Hi, I'm " + this.name + " and I study " + this.course);
  };
}

const student1 = new Student("Esther", "JavaScript");
const student2 = new Student("Alice", "HTML");

student1.introduce();
student2.introduce();