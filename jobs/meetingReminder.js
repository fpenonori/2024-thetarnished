const { Op } = require('sequelize');
const Meeting = require('../models/meetingModel');
const Reservation = require('../models/reservationModel');
const MonthlySchedule = require('../models/monthlyScheduleModel')
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');
const Subject = require('../models/subjectModel');
const { sendEmailToUser } = require('../controllers/resetController');
const fs = require('fs');
const path = require('path');

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;
const REMINDER_WINDOW_MS = process.env.MEETING_REMINDER_WINDOW_MS
    ? Number(process.env.MEETING_REMINDER_WINDOW_MS)
    : 30 * 60 * 1000;
const REMINDER_TIMEZONE = process.env.MEETING_REMINDER_TZ || 'America/Argentina/Buenos_Aires';

const friendlyFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: REMINDER_TIMEZONE,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});
const studentTemplatePath = path.join(__dirname, '..', 'meetingReminderStudentTemplate.html');
const teacherTemplatePath = path.join(__dirname, '..', 'meetingReminderTeacherTemplate.html');
const studentTemplate = fs.readFileSync(studentTemplatePath, 'utf-8');
const teacherTemplate = fs.readFileSync(teacherTemplatePath, 'utf-8');

function populateTemplate(template, replacements) {
    let result = template;
    for (const [token, value] of Object.entries(replacements)) {
        const safeValue = value == null ? '' : String(value);
        result = result.split(token).join(safeValue);
    }
    return result;
}

function buildStudentReminderHtml({ studentName, teacherName, subjectName, friendlyStart, joinUrl, password }) {
    const teacherLabel = teacherName || 'your teacher';
    const subjectLabel = subjectName || 'your class';
    const greetingName = studentName || 'Student';
    const joinListItem = joinUrl
        ? `
        <li><strong>Join Link:</strong> <a href="${joinUrl}">Join your class</a>${password ? ` (Password: ${password})` : ''}</li>`
        : '';
    const fallbackPassword = !joinUrl && password
        ? `
        <li><strong>Password:</strong> ${password}</li>`
        : '';

    return populateTemplate(studentTemplate, {
        '{{GREETING_NAME}}': greetingName,
        '{{TEACHER_LABEL}}': teacherLabel,
        '{{SUBJECT_LABEL}}': subjectLabel,
        '{{FRIENDLY_START}}': friendlyStart,
        '{{JOIN_LIST_ITEM}}': joinListItem,
        '{{FALLBACK_PASSWORD}}': fallbackPassword,
    });
}

function buildTeacherReminderHtml({ teacherName, subjectName, friendlyStart, joinUrl, password, studentNames, currentStudents, maxStudents }) {
    const greetingName = teacherName || 'Professor';
    const subjectLabel = subjectName || 'your upcoming class';
    const joinDetail = joinUrl
        ? `
        <li><strong>Join Link:</strong> <a href="${joinUrl}">${joinUrl}</a>${password ? ` (Password: ${password})` : ''}</li>`
        : `
        <li><strong>Join Link:</strong> Please share your meeting link with the students.</li>`;
    const rosterListItems = studentNames
        .map((name) => `        <li>${name}</li>`)
        .join('');
    const rosterSection = studentNames.length
        ? `
      <p><strong>Enrolled Students (${studentNames.length}${maxStudents ? `/${maxStudents}` : ''}):</strong></p>
      <ul class="student-list">
        ${rosterListItems}
      </ul>`
        : `
      <p><strong>Current enrolment:</strong> ${currentStudents}${maxStudents ? `/${maxStudents}` : ''}</p>`;

    return populateTemplate(teacherTemplate, {
        '{{GREETING_NAME}}': greetingName,
        '{{SUBJECT_LABEL}}': subjectLabel,
        '{{FRIENDLY_START}}': friendlyStart,
        '{{JOIN_DETAIL}}': joinDetail,
        '{{ROSTER_SECTION}}': rosterSection,
    });
}

async function safeSendEmail(to, subject, html, logger, contextLabel) {
    try {
        await sendEmailToUser(to, subject, html);
        // logger.log(`[Meeting Reminder] Sent ${contextLabel} to ${to}`);
    } catch (error) {
        logger.error(`[Meeting Reminder] Failed to send ${contextLabel} to ${to}`, error);
    }
}

async function checkUpcomingMeetings(logger = console) {
    const now = new Date();
    console.log('checkUpcomingMeetings - now', now)
    const reminderWindowStart = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);
    const reminderWindowEnd = new Date(reminderWindowStart.getTime() + REMINDER_WINDOW_MS);
    console.log('checkUpcomingMeetings - windowStart', reminderWindowStart);
    console.log('checkUpcomingMeetings - windowEnd', reminderWindowEnd);

    try {
        const meetings = await Meeting.findAll({
            where: {
                startTime: {
                    [Op.gte]: reminderWindowStart,
                    [Op.lt]: reminderWindowEnd,
                },
            },
            order: [['startTime', 'ASC']],
        });

        if (!meetings.length) {
            logger.log('[Meeting Reminder] No meetings starting roughly 24 hours from now.');
            return;
        }

        const teacherRemindersSent = new Set();

        for (const meeting of meetings) {
            const start = meeting.startTime instanceof Date ? meeting.startTime : new Date(meeting.startTime);
            const friendlyStart = friendlyFormatter.format(start);

            if (!meeting.reservation_id) {
                continue;
            }

            const reservation = await Reservation.findByPk(meeting.reservation_id, {
                include: [
                    { model: Student, as: 'Student' },
                    { model: Teacher, as: 'Teacher' },
                    { model: Subject, as: 'Subject' },
                ],
            });

            if (!reservation) {
                continue;
            }

            if (reservation.reservation_status !== 'booked') {
                continue;
            }

            const schedule = await MonthlySchedule.findByPk(reservation.schedule_id);

            if (!schedule) {
                continue;
            }

            const currentStudents = Number(schedule.currentstudents || 0);
            if (currentStudents <= 0) {
                continue;
            }

            const maxStudents = Number(schedule.maxstudents || 0) || undefined;
            const student = reservation.Student;
            const teacher = reservation.Teacher;
            const subject = reservation.Subject;
            const subjectName = subject?.subjectname || meeting.topic || 'your upcoming class';
            const teacherName = teacher ? `${teacher.firstname || ''} ${teacher.lastname || ''}`.trim() : '';
            const studentName = student ? `${student.firstname || ''} ${student.lastname || ''}`.trim() : '';

            if (student?.email) {
                const studentHtml = buildStudentReminderHtml({
                    studentName,
                    teacherName,
                    subjectName,
                    friendlyStart,
                    joinUrl: meeting.joinUrl,
                    password: meeting.password,
                });
                await safeSendEmail(student.email, `Class reminder: ${subjectName} on ${friendlyStart}`, studentHtml, logger, 'student reminder');
            }

            if (!teacher?.email) {
                continue;
            }

            const scheduleKey = `${schedule.monthlyscheduleid}:${teacher.teacherid || reservation.teacher_id}`;
            if (teacherRemindersSent.has(scheduleKey)) {
                continue;
            }
            teacherRemindersSent.add(scheduleKey);

            const scheduleReservations = await Reservation.findAll({
                where: {
                    schedule_id: reservation.schedule_id,
                    reservation_status: 'booked',
                },
                include: [{ model: Student, as: 'Student' }],
            });

            const teacherStudentNames = scheduleReservations
                .map((item) => {
                    if (!item.Student) {
                        return null;
                    }
                    return `${item.Student.firstname || ''} ${item.Student.lastname || ''}`.trim();
                })
                .filter(Boolean);

            const teacherHtml = buildTeacherReminderHtml({
                teacherName,
                subjectName,
                friendlyStart,
                joinUrl: meeting.joinUrl,
                password: meeting.password,
                studentNames: teacherStudentNames,
                currentStudents,
                maxStudents,
            });
            await safeSendEmail(teacher.email, `Upcoming class reminder: ${friendlyStart}`, teacherHtml, logger, 'teacher reminder');
        }
    } catch (error) {
        logger.error('[Meeting Reminder] Failed to check upcoming meetings', error);
    }
}

module.exports = {
    checkUpcomingMeetings,
    ONE_HOUR_MS,
};

