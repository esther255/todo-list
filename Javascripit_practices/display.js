const student = {
  name: "Shekinah",
  age: 22,
  course: "JavaScript",

  introduce: function () {
    console.log("Hi, my name is " + this.name);
  }
};

console.log(student.name);
student.introduce();