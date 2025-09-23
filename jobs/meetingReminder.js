const { Op } = require('sequelize');
const Meeting = require('../models/meetingModel');

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;
const REMINDER_TIMEZONE = process.env.MEETING_REMINDER_TZ || 'America/Argentina/Buenos_Aires';

const friendlyFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: REMINDER_TIMEZONE,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

async function checkUpcomingMeetings(logger = console) {
    const now = new Date();
    console.log('checkUpcomingMeetings - now', now)
    const cutoff = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);
    console.log('checkUpcomingMeetings - cutoff', cutoff)

    try {
        const meetings = await Meeting.findAll({
            where: {
                startTime: {
                    [Op.between]: [now, cutoff],
                },
            },
            order: [['startTime', 'ASC']],
        });

        if (!meetings.length) {
            logger.log('[Meeting Reminder] No meetings starting within the next 24 hours.');
            return;
        }

        console.log('meetings', meetings)

        meetings.forEach((meeting) => {
            const start = meeting.startTime instanceof Date ? meeting.startTime : new Date(meeting.startTime);
            const diffMinutes = Math.round((start.getTime() - now.getTime()) / (60 * 1000));
            const identifier = meeting.meetingId || meeting.zoomId || 'unknown';
            const friendlyStart = friendlyFormatter.format(start);

            logger.log(
                `[Meeting Reminder] Meeting ${identifier} (${meeting.topic}) starts ${friendlyStart} (${diffMinutes} minutes from now)`,
            );
        });
    } catch (error) {
        logger.error('[Meeting Reminder] Failed to check upcoming meetings', error);
    }
}

module.exports = {
    checkUpcomingMeetings,
    ONE_HOUR_MS,
};
