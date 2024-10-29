const express =  require('express');
const {
    grantAccess,
    revokeAccess,
    getFilesForTeacher,
    getFilesForStudent,
    getGrantedStudentsForFile
} = require('../controllers/fileAccessController');

const app = express();
//const authorizeRoles = require('../middleware/authMiddleware');

app.use(express.json());

const router = express.Router();

router.post('/grant/:id', grantAccess);
router.delete('/revoke/:id', revokeAccess);
router.get('/teacher/:id', getFilesForTeacher);
router.get('/student/:id', getFilesForStudent);
router.get('/all-students-granted/:id', getGrantedStudentsForFile);

module.exports = router;