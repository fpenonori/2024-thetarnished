const Teacher = require('./teacherModel');
const Schedule = require('./weeklyScheduleModel');
const Student = require('./studentModel');
const File = require('./fileModel');
const FileAccess = require('./fileAccessModel'); 


const defineAssociations = () => {

  Teacher.hasMany(Schedule, { foreignKey: 'teacherid' });
  Schedule.belongsTo(Teacher, { foreignKey: 'teacherid' });
  File.belongsToMany(Student, { through: FileAccess, foreignKey: 'file_id', as: 'students' });
  Student.belongsToMany(File, { through: FileAccess, foreignKey: 'student_id', as: 'files' });
  
};

module.exports = defineAssociations;
