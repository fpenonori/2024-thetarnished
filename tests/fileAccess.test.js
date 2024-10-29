const request = require('supertest');
const app = require('../app');

const File = require('../models/fileModel');
const FileAccess = require('../models/fileAccessModel');
const Reservation = require('../models/reservationModel');
const Student = require('../models/studentModel');
const Subject = require('../models/subjectModel');
const Teacher = require('../models/teacherModel');

describe('File Access Controller', () => {

    const mockFile = { teacher_id: 1, subject_id: 2 };
    const mockEligibleStudentId = 10;

    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('grantAccess', () => {

        it('should grant access to eligible students', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue(mockFile);
            jest.spyOn(Reservation, 'findAll').mockResolvedValue([{ student_id: mockEligibleStudentId }]);
            jest.spyOn(FileAccess, 'bulkCreate').mockResolvedValue(true);

            const response = await request(app)
                .post('/file-access/grant/1')
                .send({ student_ids: [mockEligibleStudentId], teacher_id: 1 });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Access granted successfully');
            expect(response.body.granted_students).toContain(mockEligibleStudentId);
        });

        it('should return 404 if file not found', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue(null);

            const response = await request(app)
                .post('/file-access/grant/1')
                .send({ student_ids: [mockEligibleStudentId], teacher_id: 1 });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('File not found');
        });

        it('should return 403 if unauthorized teacher', async () => {
            
            jest.spyOn(File, 'findByPk').mockResolvedValue({ teacher_id: 2 });

            const response = await request(app)
                .post('/file-access/grant/1')
                .send({ student_ids: [mockEligibleStudentId], teacher_id: 1 });

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Unauthorized operation to the file');
        });

        it('should return 400 if no eligible students', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue(mockFile);
            jest.spyOn(Reservation, 'findAll').mockResolvedValue([]);

            const response = await request(app)
                .post('/file-access/grant/1')
                .send({ student_ids: [mockEligibleStudentId], teacher_id: 1 });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('No eligible students with past or active reservations');
        });

        it('should handle internal server error', async () => {
            jest.spyOn(File, 'findByPk').mockRejectedValue(new Error('Database error'));
            const response = await request(app)
                .post('/file-access/grant/1')
                .send({ student_ids: [10], teacher_id: 1 });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Internal server error');
        });

        it('should return 400 if no students provided for file access', async () => {
            const response = await request(app)
                .post('/file-access/grant/1')
                .send({ student_ids: [], teacher_id: 1 });
    
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('No students provided for file access');
        });
    })

    describe('revokeAccess', () => {
        it('should revoke access for specified students', async () => {

            jest.spyOn(File, 'findByPk').mockResolvedValue({ teacher_id: 1 });
            jest.spyOn(FileAccess, 'findAll').mockResolvedValue([{ student_id: 10 }]);
            jest.spyOn(FileAccess, 'destroy').mockResolvedValue(true);

            const response = await request(app)
                .delete('/file-access/revoke/1')
                .send({ studentIds: [mockEligibleStudentId], teacher_id: 1 });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Access successfully revoked for all specified students.');
        });

        it('should return 404 if file not found', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue(null);

            const response = await request(app)
                .delete('/file-access/revoke/1')
                .send({ studentIds: [mockEligibleStudentId], teacher_id: 1 });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('File not found');
        });

        it('should return 403 if unauthorized teacher', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue({ teacher_id: 99 });
            const response = await request(app)
                .delete('/file-access/revoke/1')
                .send({ studentIds: [mockEligibleStudentId], teacher_id: 1 });

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Unauthorized operation to the file');
        });

        it('should return 404 if students do not have access', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue({ teacher_id: 1 });
            jest.spyOn(FileAccess, 'findAll').mockResolvedValue([]);

            const response = await request(app)
                .delete('/file-access/revoke/1')
                .send({ studentIds: [mockEligibleStudentId], teacher_id: 1 });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Some specified students do not have access to this file.');
        });

        it('should handle internal server error', async () => {
            jest.spyOn(File, 'findByPk').mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .delete('/file-access/revoke/1')
                .send({ studentIds: [10], teacher_id: 1 });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Internal server error');
        });

        it('should return 400 if no student IDs provided for revoking access', async () => {
            const response = await request(app)
                .delete('/file-access/revoke/1')
                .send({ studentIds: [], teacher_id: 1 });
    
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('No student IDs provided to revoke access.');
        });
    });

    describe('getFilesForTeacher', () => {
        it('should fetch files for a teacher', async () => {
            jest.spyOn(File, 'findAll').mockResolvedValue([
                { fileid: 1, filename: 'Test File', upload_date: '2024-01-01', subject: { subjectid: 2, subjectname: 'Math' } },
            ]);

            const response = await request(app).get('/file-access/teacher/1');

            expect(response.status).toBe(200);
            expect(response.body.files.length).toBe(1);
            expect(response.body.files[0].filename).toBe('Test File');
        });

        it('should handle internal server error', async () => {
            jest.spyOn(File, 'findAll').mockRejectedValue(new Error('Database error'));
            const response = await request(app).get('/file-access/teacher/1');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Internal server error');
        });
    });

    describe('getFilesForStudent', () => {
        it('should fetch files accessible by a student', async () => {
            jest.spyOn(Student, 'findByPk').mockResolvedValue({
                files: [
                    {
                        fileid: 1,
                        filename: 'Test File',
                        filepath: '/test/path',
                        upload_date: '2024-01-01',
                        subject: { subject_id: 2, subjectname: 'Math' },
                        teacher: { teacher_id: 1, firstname: 'John', lastname: 'Doe' },
                    },
                ],
            });

            const response = await request(app).get('/file-access/student/1');

            expect(response.status).toBe(200);
            expect(response.body.files.length).toBe(1);
        });

        it('should return 404 if student not found', async () => {
            //Student.findByPk.mockResolvedValue(null);
            jest.spyOn(Student, 'findByPk').mockResolvedValue(null);
            const response = await request(app).get('/file-access/student/999');

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Files or student not found');
        });

        it('should handle internal server error', async () => {
            jest.spyOn(Student, 'findByPk').mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/file-access/student/1');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Internal server error');
        });

        it('should return 404 if student has no files granted access', async () => {
            jest.spyOn(Student, 'findByPk').mockResolvedValue({
                files: []
            });
    
            const response = await request(app).get('/file-access/student/1');
            
            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Files or student not found');
        });
    });

    // Tests for getGrantedStudentsForFile
    describe('getGrantedStudentsForFile', () => {
        it('should fetch students granted access to a file', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue({
                fileid: 1,
                filename: 'Test File',
                students: [{ studentid: 10, firstname: 'Jane', lastname: 'Doe' }],
            });

            const response = await request(app).get('/file-access/all-students-granted/1');

            expect(response.status).toBe(200);
            expect(response.body.students[0].firstname).toBe('Jane');
        });

        it('should return 404 if file not found', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue(null);
            const response = await request(app).get('/file-access/all-students-granted/999');

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('File not found');
        });

        it('should handle internal server error', async () => {
            jest.spyOn(File, 'findByPk').mockRejectedValue(new Error('Database error'));
            const response = await request(app).get('/file-access/all-students-granted/1');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Internal server error');
        });
    });
});
