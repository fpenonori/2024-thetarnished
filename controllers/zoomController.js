const axios = require('axios');
const qs = require('qs');

const ZOOM_OAUTH_ENDPOINT = 'https://zoom.us/oauth/token';
const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';

const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';
const DEFAULT_LEAD_TIME_MS = 2 * 60 * 60 * 1000;

// auth
function getZoomCredentials() {
    const required = ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length) {
        const error = new Error(`Missing required environment variables: ${missing.join(', ')}`);
        error.code = 'ZOOM_ENV_MISSING';
        throw error;
    }

    return {
        accountId: process.env.ZOOM_ACCOUNT_ID,
        clientId: process.env.ZOOM_CLIENT_ID,
        clientSecret: process.env.ZOOM_CLIENT_SECRET,
    };
}

async function getAccessToken() {
    try {
        const { accountId, clientId, clientSecret } = getZoomCredentials();
        const payload = qs.stringify({ grant_type: 'account_credentials', account_id: accountId });

        const response = await axios.post(
            ZOOM_OAUTH_ENDPOINT,
            payload,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                },
            },
        );

        return {
            token: response.data.access_token,
            expiresIn: response.data.expires_in,
        };
    } catch (error) {
        const status = error.response?.status;
        const data = error.response?.data;
        const messageDetails = data?.reason || data?.message || error.message;
        const err = new Error(`Failed to obtain Zoom access token${status ? ` (status ${status})` : ''}: ${messageDetails}`);
        err.status = status;
        err.details = data;
        throw err;
    }
}

// create meeting
function formatDateTimeInTimeZone(date, timeZone = DEFAULT_TIMEZONE) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const lookup = parts.reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});

    return `${lookup.year}-${lookup.month}-${lookup.day}T${lookup.hour}:${lookup.minute}:${lookup.second}`;
}

function buildDefaultStartTime(timeZone = DEFAULT_TIMEZONE) {
    const startDate = new Date(Date.now() + DEFAULT_LEAD_TIME_MS);
    return formatDateTimeInTimeZone(startDate, timeZone);
}

function normalizePayloadWithTimezone(meetingOptions = {}) {
    const payload = { ...meetingOptions };

    payload.timezone = payload.timezone || DEFAULT_TIMEZONE;

    if (!payload.start_time) {
        payload.start_time = buildDefaultStartTime(payload.timezone);
    }

    return payload;
}

function getDefaultMeetingPayload() {
    const basePayload = {
        topic: 'My Meeting',
        type: 2,
        settings: {
            join_before_host: true,
            waiting_room: false,
        },
    };

    return normalizePayloadWithTimezone(basePayload);
}

async function createMeeting(userId = 'me', meetingOptions = {}) {
    const { token } = await getAccessToken();
    const payload = Object.keys(meetingOptions).length
        // ? normalizePayloadWithTimezone(meetingOptions)
        ? meetingOptions
        : getDefaultMeetingPayload();

    try {
        const response = await axios.post(
            `${ZOOM_API_BASE_URL}/users/${encodeURIComponent(userId)}/meetings`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        return response.data;
    } catch (error) {
        const status = error.response?.status;
        const data = error.response?.data;
        const messageDetails = data?.message || error.message;
        const err = new Error(`Failed to create Zoom meeting${status ? ` (status ${status})` : ''}: ${messageDetails}`);
        err.status = status;
        err.details = data;
        throw err;
    }
}

async function createZoomMeeting({ topic, time }) {
    const startDate = time instanceof Date ? time : new Date(time);

    if (Number.isNaN(startDate.getTime())) {
        throw new Error('Invalid meeting time provided to createZoomMeeting');
    }

    const payload = normalizePayloadWithTimezone({
        topic: topic || 'My Meeting',
        type: 2,
        settings: {
            join_before_host: true,
            waiting_room: false,
        },
        start_time: formatDateTimeInTimeZone(startDate),
        duration: 60,
    });

    const createdMeeting = await createMeeting('me', payload);
    return createdMeeting;
}

module.exports = {
    createZoomMeeting,
};

