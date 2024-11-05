const express =  require('express');
const {
    uploadSingleFile,
    getSingleFile,
    renameSingleFile,
    deleteSingleFile
} = require('../controllers/fileController');
const app = express();
const upload = require('../config/multerConfig');
const authorizeRoles = require('../middleware/authMiddleware');

app.use(express.json());

const router = express.Router();

router.post('/upload-single', upload.single('file'), authorizeRoles('TEACHER'), uploadSingleFile);
router.post('/:id', authorizeRoles('TEACHER', 'STUDENT'), getSingleFile);
router.put('/update-single/:id', authorizeRoles('TEACHER'),renameSingleFile);
router.delete('/delete-single/:id', authorizeRoles('TEACHER'), deleteSingleFile);

module.exports = router;