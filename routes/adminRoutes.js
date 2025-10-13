const express = require('express');
const {
    activateTeacher,
    disableTeacher,
    getInactiveTeachers,
    testCron,
    populateDB,
    seedTeacherSchedule,
    wipeAllModeledTables
} = require('../controllers/adminController');
const authorizeRoles = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/activate-teacher/:id', authorizeRoles('ADMIN'), activateTeacher)
router.post('/disable-teacher/:id', authorizeRoles('ADMIN'), disableTeacher)
router.get('/inactive-teachers', authorizeRoles('ADMIN'), getInactiveTeachers)
//router.get('/test-cron', authorizeRoles('ADMIN'), testCron)
//router.post('/populate-db', authorizeRoles('ADMIN'), populateDB)
//router.post('/seed-schedule', authorizeRoles('ADMIN'), seedTeacherSchedule)
//router.delete('/wipe-db', authorizeRoles('ADMIN'), wipeAllModeledTables)


module.exports = router;
