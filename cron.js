require('dotenv').config();
const cron = require('node-cron');
const { checkUpcomingMeetings } = require('./jobs/meetingReminder');
const { replenishMonthlySchedules } = require('./jobs/replenishMonthlySchedules');

const MEETING_REMINDER_CRON = process.env.MEETING_REMINDER_CRON || '0 * * * *';
const MEETING_REMINDER_TZ = process.env.MEETING_REMINDER_TZ || 'America/Argentina/Buenos_Aires';

const MONTHLY_SCHEDULE_CRON = process.env.MONTHLY_SCHEDULE_CRON || '0 0 * * *';
const MONTHLY_SCHEDULE_TZ = process.env.MONTHLY_SCHEDULE_TZ || MEETING_REMINDER_TZ;

function scheduleMeetingReminder() {
    const run = async () => {
        try {
            await checkUpcomingMeetings();
        } catch (error) {
            console.error('[Meeting Reminder] Unexpected error while checking upcoming meetings', error);
        }
    };

    run();

    cron.schedule(
        MEETING_REMINDER_CRON,
        run,
        {
            timezone: MEETING_REMINDER_TZ,
        },
    );
}

function scheduleMonthlyScheduleReplenisher() {
    const run = async () => {
        try {
            await replenishMonthlySchedules();
        } catch (error) {
            console.error('[Monthly Schedule Replenisher] Unexpected error while generating future schedules', error);
        }
    };

    cron.schedule(
        MONTHLY_SCHEDULE_CRON,
        run,
        {
            timezone: MONTHLY_SCHEDULE_TZ,
        },
    );
}

function scheduleCronJobs() {
    scheduleMeetingReminder();
    scheduleMonthlyScheduleReplenisher();
}

module.exports = scheduleCronJobs;
