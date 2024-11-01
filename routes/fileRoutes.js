const express =  require('express');
const {
    uploadSingleFile,
    getSingleFile,
    renameSingleFile,
    deleteSingleFile
} = require('../controllers/fileController');
const app = express();
const upload = require('../config/multerConfig');
//const authorizeRoles = require('../middleware/authMiddleware');

app.use(express.json());

const router = express.Router();

router.post('/upload-single', upload.single('file'), uploadSingleFile);
router.post('/:id', getSingleFile);
router.put('/update-single/:id', renameSingleFile);
router.delete('/delete-single/:id', deleteSingleFile);

module.exports = router;