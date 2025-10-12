const { Op } = require('sequelize');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

const sequelize = require('../config/database');
const WeeklySchedule = require('../models/weeklyScheduleModel');
const MonthlySchedule = require('../models/monthlyScheduleModel');
const Teacher = require('../models/teacherModel');


dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TZ = process.env.MONTHLY_SCHEDULE_TZ
  || process.env.MEETING_REMINDER_TZ
  || 'America/Argentina/Buenos_Aires';
const DAYS_AHEAD = Number(28);
const OFFSET_HOURS = Number(3);
const EXISTING_WINDOW_SECONDS = Number(1);
const RETRY_ATTEMPTS = Number(process.env.MONTHLY_SCHEDULE_RETRY_ATTEMPTS || 5);
const RETRY_DELAY_MS = Number(process.env.MONTHLY_SCHEDULE_RETRY_DELAY_MS || 250);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTimeParts(rawValue) {
  if (!rawValue) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const [rawHours, rawMinutes, rawSeconds] = String(rawValue).split(':');
  return {
    hours: Number(rawHours) || 0,
    minutes: Number(rawMinutes) || 0,
    seconds: Number(rawSeconds) || 0,
  };
}

function createWindowAround(date) {
  return {
    start: date.subtract(EXISTING_WINDOW_SECONDS, 'second').toDate(),
    end: date.add(EXISTING_WINDOW_SECONDS, 'second').toDate(),
  };
}

async function runWithTransactionRetries(operation, logger) {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      const errorCode = error?.parent?.code || error?.original?.code || error?.code;
      const shouldRetry = errorCode === '40001' && attempt < RETRY_ATTEMPTS;
      if (!shouldRetry) {
        throw error;
      }

      attempt += 1;
      const backoff = RETRY_DELAY_MS * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * RETRY_DELAY_MS);
      logger.warn(`[Monthly Schedule Replenisher] Serialization failure (attempt ${attempt} of ${RETRY_ATTEMPTS}). Retrying after ${backoff + jitter}ms.`);
      await wait(backoff + jitter);
    }
  }
}

async function replenishMonthlySchedules(logger = console) {
  const currentTimeZoned = dayjs().tz(DEFAULT_TZ);
  const yesterdayStart = currentTimeZoned.subtract(1, 'day').startOf('day');
  const yesterdayJsDay = yesterdayStart.day();
  const weeklyScheduleDay = yesterdayJsDay === 0 ? 7 : yesterdayJsDay;
  const runDateLabel = yesterdayStart.format('YYYY-MM-DD');

  logger.log(`[Monthly Schedule Replenisher] Starting run for ${runDateLabel} (weekday ${weeklyScheduleDay}).`);

  const weeklySchedules = await WeeklySchedule.findAll({
    where: { dayofweek: weeklyScheduleDay },
  });

  if (!weeklySchedules.length) {
    logger.log(`[Monthly Schedule Replenisher] No weekly schedules matched ${runDateLabel}.`);
    return;
  }

  const teacherIds = [...new Set(weeklySchedules.map((item) => String(item.teacherid)))];
  const teachers = await Teacher.findAll({
    where: {
      teacherid: {
        [Op.in]: teacherIds,
      },
    },
    attributes: ['teacherid', 'is_active', 'on_vacation'],
  });
  const teacherById = new Map(teachers.map((teacher) => [String(teacher.teacherid), teacher]));

  let createdCount = 0;
  let examinedCount = 0;

  await runWithTransactionRetries(() => sequelize.transaction(async (transaction) => {
    for (const weeklySchedule of weeklySchedules) {
      examinedCount += 1;

      const teacherId = String(weeklySchedule.teacherid);
      const teacherRecord = teacherById.get(teacherId);

      if (!teacherRecord) {
        logger.warn(`[#${teacherId}] Teacher record not found - skipping.`);
        continue;
      }

      if (!teacherRecord.is_active || teacherRecord.on_vacation) {
        logger.warn(`[#${teacherId}] Teacher inactive - skipping.`);
        continue;
      }

      const { hours, minutes, seconds } = parseTimeParts(weeklySchedule.start_time);

      const slotStartYesterday = yesterdayStart
        .hour(hours)
        .minute(minutes)
        .second(seconds)
        .millisecond(0);

      logger.log(`[#${teacherId}] Checking weekly slot ${slotStartYesterday.format('YYYY-MM-DD HH:mm:ss')}.`);

      const storedSlotTimestamp = slotStartYesterday.subtract(OFFSET_HOURS, 'hour');
      const storedSlotWindow = createWindowAround(storedSlotTimestamp);

      const existingMonthlySlot = await MonthlySchedule.findOne({
        where: {
          teacherid: weeklySchedule.teacherid,
          datetime: {
            [Op.between]: [storedSlotWindow.start, storedSlotWindow.end],
          },
        },
        transaction,
      });

      if (!existingMonthlySlot) {
        logger.warn(`[#${teacherId}] No monthly schedule found for ${slotStartYesterday.format('YYYY-MM-DD HH:mm:ss')} - skipping.`);
        continue;
      }

      const futureSlotTimestamp = slotStartYesterday
        .add(DAYS_AHEAD, 'day')
        .subtract(OFFSET_HOURS, 'hour');
      const futureSlotWindow = createWindowAround(futureSlotTimestamp);

      const futureSlotExists = await MonthlySchedule.findOne({
        where: {
          teacherid: weeklySchedule.teacherid,
          datetime: {
            [Op.between]: [futureSlotWindow.start, futureSlotWindow.end],
          },
        },
        transaction,
      });

      if (futureSlotExists) {
        const futureSlotDisplay = futureSlotTimestamp.add(OFFSET_HOURS, 'hour');
        logger.warn(`[#${teacherId}] Monthly schedule already exists for ${futureSlotDisplay.format('YYYY-MM-DD HH:mm:ss')} - skipping.`);
        continue;
      }

      await MonthlySchedule.create({
        datetime: futureSlotTimestamp.toDate(),
        teacherid: weeklySchedule.teacherid,
        maxstudents: weeklySchedule.maxstudents,
        currentstudents: 0,
      }, { transaction });

      logger.log(`[#${teacherId}] Created monthly slot for ${futureSlotTimestamp.add(OFFSET_HOURS, 'hour').format('YYYY-MM-DD HH:mm:ss')}.`);

      createdCount += 1;
    }
  }), logger);

  logger.log(`[Monthly Schedule Replenisher] Created ${createdCount} monthly schedules (examined ${examinedCount}).`);
}

module.exports = {
  replenishMonthlySchedules,
};
