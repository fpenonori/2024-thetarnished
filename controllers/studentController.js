const Student = require('../models/studentModel');
const sequelize = require('../config/database');
const Reservation = require('../models/reservationModel');
const MonthlySchedule = require('../models/monthlyScheduleModel');

const getStudentById = async (req, res) => {
    try{
        const { id } = req.params;
        const student = await Student.findByPk(id);
        if(!student){
            return res.status(404).json({ message: 'Student not found' });
        }
        return res.status(200).json(student);
    }
    catch(error){
        /* istanbul ignore next */
        return res.status(400).json({error: error.message});
    }
};

const updateStudent = async (req, res) => {
    try {
      const { id } = req.params;
      const { firstname, lastname } = req.body;
      const student = await Student.findByPk(id);
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
      student.firstname = firstname;
      student.lastname = lastname;
      await student.save();
      return res.status(200).json(student);
    } catch (error) {
      /* istanbul ignore next */
      return res.status(400).json({ message: `Error updating student: ${error.message}` });
    }
  };

  const deleteStudent = async (req, res) => {
    try {
      const { id } = req.params;
      

      const student = await Student.findByPk(id);
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
  

      const reservations = await Reservation.findAll({ where: { student_id: id } });
  

      for (const reservation of reservations) {
        await MonthlySchedule.update(
          {
            istaken: false,
            currentstudents: sequelize.literal('currentstudents - 1')
          },
          {
            where: { monthlyscheduleid: reservation.schedule_id }
          }
        );
      }
  

      await Reservation.destroy({ where: { student_id: id } });
  

      await student.destroy();
  
      return res.status(200).json({ message: 'Student and associated reservations deleted successfully' });
    } catch (error) {
      /* istanbul ignore next */
      return res.status(400).json({ message: `Error deleting student: ${error.message}` });
    }
  };

  // I needed to get previous teachers without subject id
  const getPreviousTeachers = async (req, res) => {
    try {
      // last 3 distinct teachers who had reservations with the student
      const { id } = req.params;
      const { subjectid } = req.query;

      console.log('req.query', req.query)

      console.log('id', id)
      console.log('subjedtid', subjectid)

      const replacements = { studentid: id };

      // optional: passing subject id
      let subjectCondition = '';
      if (subjectid) {
        replacements.subjectid = subjectid;
        subjectCondition = 'AND subjectteacher.subjectid = :subjectid';
      }


  const [results] = await sequelize.query(`
    SELECT DISTINCT ON (teachers.teacherid) teachers.teacherid, teachers.firstname, teachers.lastname
    FROM teachers
    JOIN reservations
      ON teachers.teacherid = reservations.teacher_id
    JOIN subjectteacher
      ON teachers.teacherid = subjectteacher.teacherid
    WHERE reservations.student_id = :studentid
      ${subjectCondition}
    ORDER BY teachers.teacherid, reservations.id DESC
    LIMIT 3;
  `, { replacements });

      return res.status(200).json(results);
    } catch (error) {
      /* istanbul ignore next */
      console.log('teachers error', error)
      return res.status(500).json({ message: `Error getting previous teachers: ${error.message}` });
    }
  };
  

module.exports = {
    getStudentById,
    updateStudent,
    deleteStudent,
    getPreviousTeachers
}