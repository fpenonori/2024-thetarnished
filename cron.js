require('dotenv').config();
const cron = require('node-cron');
const { checkUpcomingMeetings } = require('./jobs/meetingReminder');

// arranca cron
const MEETING_REMINDER_CRON = process.env.MEETING_REMINDER_CRON || '0 * * * *';
const MEETING_REMINDER_TZ = process.env.MEETING_REMINDER_TZ || 'America/Argentina/Buenos_Aires';

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

module.exports = scheduleMeetingReminder;