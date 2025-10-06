const express = require('express');
const {
    activateTeacher,
    disableTeacher,
    getInactiveTeachers,
    testCron,
    populateDB,
    wipeAllModeledTables
} = require('../controllers/adminController');
const authorizeRoles = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/activate-teacher/:id', authorizeRoles('ADMIN'), activateTeacher)
router.post('/disable-teacher/:id', authorizeRoles('ADMIN'), disableTeacher)
router.get('/inactive-teachers', authorizeRoles('ADMIN'), getInactiveTeachers)
router.get('/test-cron', authorizeRoles('ADMIN'), testCron)
router.post('/populate-db', populateDB)
router.delete('/wipe-db', wipeAllModeledTables)


module.exports = router;