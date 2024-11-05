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
const authorizeRoles = require('../middleware/authMiddleware');

app.use(express.json());

const router = express.Router();

router.post('/grant/:id', authorizeRoles('TEACHER'), grantAccess);
router.delete('/revoke/:fileId', authorizeRoles('TEACHER'), revokeAccess);
router.get('/teacher/:teacher_id', authorizeRoles('TEACHER'), getFilesForTeacher);
router.get('/student/:student_id', authorizeRoles('STUDENT'),getFilesForStudent);
router.get('/all-students-granted/:file_id', authorizeRoles('TEACHER'), getGrantedStudentsForFile);
router.get('/eligible-students/:fileId', authorizeRoles('TEACHER'), getEligibleStudents);


module.exports = router;