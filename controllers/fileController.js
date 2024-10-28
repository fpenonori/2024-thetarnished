const fs = require('node:fs');
const path = require('node:path');
const File = require('../models/fileModel');
const Teacher = require('../models/teacherModel');
const Subject = require('../models/subjectModel');
const { UniqueConstraintError } = require('sequelize');

const uploadSingleFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const { teacher_id, subject_id } = req.body;
        const fileName = req.file.originalname;
        const filePath = req.file.path;
        const teacher = await Teacher.findByPk(teacher_id);
        const subject = await Subject.findByPk(subject_id);
        if (!teacher || !subject) {
            return res.status(404).json({ message: 'Teacher or subject not found' });
        }
        const file = await File.create({
            filename: fileName,
            filepath: filePath,
            teacher_id,
            subject_id
        });
        res.status(201).json({ message: 'File uploaded successfully', file });
    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            return res.status(400).json({ error: 'A file with this name already exists for this teacher and subject.' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
}

const getSingleFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const { teacher_id } = req.body;

        const file = await File.findByPk(fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (file.teacher_id !== teacher_id) {
            return res.status(401).json({ message: 'Unauthorized file access' });
        }

        const filePath = path.resolve(file.filepath);

        res.download(filePath, file.filename, (err) => {
            if (err) {
                console.error('Error serving file:', err);
                res.status(500).json({ message: 'Error serving file' });
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }

}

const renameSingleFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const { new_filename, teacher_id } = req.body;

        if (!/^[a-zA-Z0-9_-]+$/.test(new_filename)) {
            return res.status(400).json({ message: 'Filename must be alphanumeric and can only contain underscores (_) and hyphens (-)' });
        }
        const file = await File.findByPk(fileId);
        
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }
        if (file.teacher_id !== teacher_id) {
            return res.status(401).json({ message: 'Unauthorized file access' });
        }

        const extension = path.extname(file.filename);
        const newFullName = `${new_filename}${extension}`;

        const duplicateFile = await File.findOne({
            where: {
                teacher_id: file.teacher_id,
                subject_id: file.subject_id,
                filename: newFullName,
            },
        });
        if (duplicateFile) {
            return res.status(400).json({ message: 'A file with this name already exists for this teacher and subject.' });
        }

        file.filename = newFullName;
        await file.save();
        res.status(200).json({ message: 'File renamed successfully', file });

    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            return res.status(400).json({ message: 'A file with this name already exists for this teacher and subject.' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteSingleFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const { teacher_id } = req.body;

        const file = await File.findByPk(fileId);
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }
        if (file.teacher_id !== teacher_id) {
            return res.status(401).json({ message: 'Unauthorized file access' });
        }

        const filePath = path.resolve(file.filepath);

        fs.unlink(filePath, async (err) => {
            if (err) {
                console.error('Error deleting file from filesystem:', err);
                return res.status(500).json({ message: 'Error deleting file from filesystem' });
            }
            await file.destroy();

            res.status(200).json({ message: 'File deleted successfully' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    uploadSingleFile,
    getSingleFile,
    deleteSingleFile,
    renameSingleFile
}
