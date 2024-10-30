const express =  require('express');
const {
    grantAccess,
    revokeAccess,
    getFilesForTeacher,
    getFilesForStudent,
    getGrantedStudentsForFile,
    getEligibleStudents
} = require('../controllers/fileAccessController');

const app = express();
//const authorizeRoles = require('../middleware/authMiddleware');

app.use(express.json());

const router = express.Router();

router.post('/grant/:id', grantAccess);
router.delete('/revoke/:fileId', revokeAccess);
router.get('/teacher/:teacher_id', getFilesForTeacher);
router.get('/student/:student_id', getFilesForStudent);
router.get('/all-students-granted/:file_id', getGrantedStudentsForFile);
router.get('/eligible-students/:fileId', getEligibleStudents);


module.exports = router;