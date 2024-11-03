const Teacher = require('./teacherModel');
const Schedule = require('./weeklyScheduleModel');
const Student = require('./studentModel');
const File = require('./fileModel');
const FileAccess = require('./fileAccessModel'); 
const Reservation = require('./reservationModel');
const Subject = require('./subjectModel');

const defineAssociations = () => {

  Teacher.hasMany(Schedule, { foreignKey: 'teacherid' });
  Schedule.belongsTo(Teacher, { foreignKey: 'teacherid' });
  File.belongsToMany(Student, { through: FileAccess, foreignKey: 'file_id', as: 'students' });
  Student.belongsToMany(File, { through: FileAccess, foreignKey: 'student_id', as: 'files' });
  Student.hasMany(Reservation, { foreignKey: 'student_id', as: 'Reservations' });
  Teacher.belongsToMany(Subject, { through: 'subjectteacher', foreignKey: 'teacherid' });
  Subject.belongsToMany(Teacher, { through: 'subjectteacher', foreignKey: 'subjectid' });

};

module.exports = defineAssociations;
