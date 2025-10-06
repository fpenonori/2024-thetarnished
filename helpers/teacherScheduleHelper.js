const moment = require('moment');
const Teacher = require('../models/teacherModel');
const Schedule = require('../models/weeklyScheduleModel');
const MonthlySchedule = require('../models/monthlyScheduleModel');
const { createMonthlySchedule } = require('../controllers/monthlyScheduleController');

function createDate(start_time, dayofweek) {
  const baseDate = moment().startOf('week').add(dayofweek, 'days');
  const date = moment(baseDate).set({
    hour: moment(start_time, 'HH:mm:ss').hours(),
    minute: moment(start_time, 'HH:mm:ss').minutes(),
    second: moment(start_time, 'HH:mm:ss').seconds(),
  });
  return date.format('YYYY-MM-DD HH:mm:ss');
}

async function ensureTeacherSchedule({ teacherid, schedule }, { transaction } = {}) {
  const teacher = await Teacher.findByPk(teacherid, { transaction });
  if (!teacher) {
    const err = new Error('Teacher not found');
    err.status = 404;
    throw err;
  }
  if (!teacher.is_active) {
    const err = new Error('Teacher is not active');
    err.status = 400;
    throw err;
  }

  await Schedule.destroy({ where: { teacherid }, transaction });
  await MonthlySchedule.destroy({
    where: { teacherid, currentstudents: 0 },
    transaction,
  });

  const weeklySlots = [];
  for (const slot of schedule) {
    const weekly = await Schedule.create(
      {
        teacherid,
        start_time: slot.start_time,
        end_time: slot.end_time,
        dayofweek: slot.dayofweek,
        maxstudents: slot.maxstudents,
      },
      { transaction }
    );

    const datetime = createDate(slot.start_time, slot.dayofweek);
    await createMonthlySchedule(datetime, teacherid, slot.maxstudents, 0);
    weeklySlots.push(weekly);
  }

  return weeklySlots;
}

module.exports = { ensureTeacherSchedule };
