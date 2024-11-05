const { Op } = require('sequelize');
const File = require('../models/fileModel');
const Student = require('../models/studentModel');
const Reservation = require('../models/reservationModel');
const Subject = require('../models/subjectModel');
const FileAccess = require('../models/fileAccessModel');
const Teacher = require('../models/teacherModel');

const grantAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { student_ids, teacher_id } = req.body;

        if (!Array.isArray(student_ids) || student_ids.length === 0) {
            return res.status(400).json({ message: 'No students provided for file access' });
        }

        const file = await File.findByPk(id);

        console.log('File id:', id);
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (file.teacher_id !== teacher_id) {
            return res.status(403).json({ message: 'Unauthorized operation to the file' });
        }

        const subject_id = file.subject_id;

        const eligibleStudents = await Reservation.findAll({
            where: {
                student_id: { [Op.in]: student_ids },
                teacher_id: teacher_id,
                subject_id: subject_id
            },
            attributes: ['student_id'],
            group: ['student_id'],
        });

        const eligibleStudentIds = eligibleStudents.map(reservation => reservation.student_id);

        console.log('Eligible Student IDs:', eligibleStudentIds);

        if (eligibleStudentIds.length === 0) {
            return res.status(400).json({ message: 'No eligible students with past or active reservations' });
        }

        const accessGrants = eligibleStudentIds.map(student_id => ({
            file_id: id,
            student_id: student_id,
        }));

        await FileAccess.bulkCreate(accessGrants, { ignoreDuplicates: true });

        res.status(200).json({
            message: 'Access granted successfully',
            granted_students: eligibleStudentIds,
        });
    } catch (error) {
        console.error('Error granting file access:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const revokeAccess = async (req, res) => {
    try {
        const { fileId } = req.params;
        const { student_ids, teacher_id } = req.body;

        if (!student_ids || student_ids.length === 0) {
            return res.status(400).json({ message: 'No student IDs provided to revoke access.' });
        }

        const file = await File.findByPk(fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (file.teacher_id !== teacher_id) {
            return res.status(403).json({ message: 'Unauthorized operation to the file' });
        }

        const accessRecords = await FileAccess.findAll({
            where: {
                file_id: fileId,
                student_id: student_ids,
            },
        });

        const foundStudentIds = accessRecords.map(record => record.student_id);
        const missingStudentIds = student_ids.filter(id => !foundStudentIds.includes(id));

        if (missingStudentIds.length > 0) {
            return res.status(404).json({
                message: 'Some specified students do not have access to this file.',
                missingStudentIds
            });
        }

        await FileAccess.destroy({
            where: {
                file_id: fileId,
                student_id: student_ids,
            },
        });

        return res.status(200).json({ message: 'Access successfully revoked for all specified students.' });
    } catch (error) {
        console.error('Error revoking file access:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const getFilesForTeacher = async (req, res) => {
    try {
        const { teacher_id } = req.params;

        const files = await File.findAll({
            where: { teacher_id },
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['subjectid', 'subjectname']
                }
            ],
            attributes: ['fileid', 'filename', 'filepath', 'upload_date']
        });

        const formattedFiles = files.map(file => ({
            fileid: file.fileid,
            filename: file.filename,
            filepath: file.filepath,
            upload_date: String(new Date(file.upload_date).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })),
            subject: {
                subject_id: file.subject.subjectid,
                subjectname: file.subject.subjectname
            }
        }));

        res.status(200).json({ files: formattedFiles });
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getFilesForStudent = async (req, res) => {
    try {
        const { student_id } = req.params;

        const student = await Student.findByPk(student_id, {
            include: [
                {
                    model: File,
                    as: 'files',
                    through: { attributes: [] },
                    include: [
                        { model: Subject, as: 'subject', attributes: ['subjectid', 'subjectname'] },
                        { model: Teacher, as: 'teacher', attributes: ['teacherid', 'firstname', 'lastname'] }
                    ]
                }
            ]
        });

        if (!student || student.files.length === 0) {
            return res.status(404).json({ message: 'Files or student not found' });
        }

        const files = student.files.map(file => ({
            fileid: file.fileid,
            filename: file.filename,
            filepath: file.filepath,
            upload_date: String(new Date(file.upload_date).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })),
            subject: {
                subject_id: file.subject.subjectid, // Ensure consistency here
                subjectname: file.subject.subjectname
            },
            teacher: {
                teacher_id: file.teacher.teacherid, // Change to match the frontend expectation
                firstname: file.teacher.firstname,
                lastname: file.teacher.lastname
            }
        }));

        res.status(200).json({ files });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getGrantedStudentsForFile = async (req, res) => {
    try {
        const { file_id } = req.params;

        const file = await File.findByPk(file_id, {
            include: [
                {
                    model: Student,
                    as: 'students',
                    attributes: ['studentid', 'firstname', 'lastname', 'email'],
                    through: { attributes: [] }
                }
            ]
        });

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        const response = {
            file_id: file.fileid,
            filename: file.filename,
            students: file.students.map(student => ({
                student_id: student.studentid,
                fullname: `${student.firstname} ${student.lastname}`,
                email: student.email
            }))
        };
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getEligibleStudents = async (req, res) => {
    try {
        const { fileId } = req.params;

        const file = await File.findByPk(fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        const { teacher_id, subject_id } = file;

        const eligibleStudents = await Student.findAll({
            attributes: ['studentid', 'firstname', 'lastname', 'email'],
            include: [{
                model: Reservation,
                as: 'Reservations', // Especifica el alias correcto
                where: { teacher_id, subject_id }, // Filtros aplicados en Reservation
                attributes: [],  // No necesitamos atributos de Reservation
            }],
        });

        const students = eligibleStudents.map(student => ({
            student_id: student.studentid,
            fullname: `${student.firstname} ${student.lastname}`,
            email: student.email
        }));

        if (students.length === 0) {
            return res.status(404).json({ message: 'No eligible students found' });
        }

        res.status(200).json({ students });
    } catch (error) {
        console.error('Error retrieving eligible students:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


module.exports = {
    grantAccess,
    revokeAccess,
    getFilesForTeacher,
    getFilesForStudent,
    getGrantedStudentsForFile,
    getEligibleStudents
};