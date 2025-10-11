const Teacher = require("./teacherModel");
const Schedule = require("./weeklyScheduleModel");
const MonthlySchedule = require("./monthlyScheduleModel");
const Student = require("./studentModel");
const File = require("./fileModel");
const FileAccess = require("./fileAccessModel");
const Reservation = require("./reservationModel");
const Subject = require("./subjectModel");
const SubjectTeacher = require("./subjectTeacherModel");

const defineAssociations = () => {
  Teacher.hasMany(Schedule, { foreignKey: "teacherid" });
  Schedule.belongsTo(Teacher, { foreignKey: "teacherid" });
  File.belongsToMany(Student, {
    through: FileAccess,
    foreignKey: "file_id",
    as: "students",
  });
  Student.belongsToMany(File, {
    through: FileAccess,
    foreignKey: "student_id",
    as: "files",
  });
  Student.hasMany(Reservation, {
    foreignKey: "student_id",
    as: "Reservations",
  });
  Teacher.belongsToMany(Subject, {
    through: "subjectteacher",
    foreignKey: "teacherid",
  });
  Subject.belongsToMany(Teacher, {
    through: "subjectteacher",
    foreignKey: "subjectid",
  });

  // new association
  Teacher.hasMany(MonthlySchedule, {
    foreignKey: "teacherid",
    as: "monthlySchedules",
  });
  MonthlySchedule.belongsTo(Teacher, {
    foreignKey: "teacherid",
    as: "teacher",
  });

  // Reservation.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
  Teacher.hasMany(Reservation, {
    foreignKey: "teacher_id",
    as: "Reservations",
  });


};

module.exports = defineAssociations;
