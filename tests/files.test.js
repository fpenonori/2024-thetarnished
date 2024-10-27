const request = require('supertest');
const app = require('../app');
const { File, Teacher, Subject } = require('../models');
const fs = require('fs');
const { UniqueConstraintError } = require('sequelize');

jest.mock('fs');

describe('File Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks(); 
    });

    describe('uploadSingleFile', () => {
        it.only('should upload a file successfully', async () => {
            jest.spyOn(Teacher, 'findByPk').mockResolvedValue({ id: 1 });
            jest.spyOn(Subject, 'findByPk').mockResolvedValue({ id: 1 });
            jest.spyOn(File, 'create').mockResolvedValue({
                id: 1,
                filename: 'testfile.txt',
                filepath: 'uploads/testfile.txt',
                teacher_id: 1,
                subject_id: 1,
            });

            const response = await request(app)
                .post('/files/upload-single')
                .attach('file', 'path/to/local/testfile.txt')
                .field('teacher_id', 1)
                .field('subject_id', 1);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('File uploaded successfully');
        });

        it('should return 404 if teacher or subject is not found', async () => {
            jest.spyOn(Teacher, 'findByPk').mockResolvedValue(null);

            const response = await request(app)
                .post('/files/upload-single')
                .attach('file', 'path/to/local/testfile.txt')
                .field('teacher_id', 9999)
                .field('subject_id', 1);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Teacher or subject not found');
        });

        it('should return 400 if no file is uploaded', async () => {
            jest.spyOn(Teacher, 'findByPk').mockResolvedValue({ id: 1 });
            jest.spyOn(Subject, 'findByPk').mockResolvedValue({ id: 1 });

            const response = await request(app)
                .post('/files/upload-single')
                .field('teacher_id', 1)
                .field('subject_id', 1);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('No file uploaded');
        });

        it('should handle unique constraint error', async () => {
            jest.spyOn(Teacher, 'findByPk').mockResolvedValue({ id: 1 });
            jest.spyOn(Subject, 'findByPk').mockResolvedValue({ id: 1 });
            jest.spyOn(File, 'create').mockRejectedValue(new UniqueConstraintError());

            const response = await request(app)
                .post('/files/upload-single')
                .attach('file', 'path/to/local/testfile.txt')
                .field('teacher_id', 1)
                .field('subject_id', 1);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('A file with this name already exists for this teacher and subject.');
        });

        it('should return 500 on internal server error', async () => {
            jest.spyOn(Teacher, 'findByPk').mockRejectedValue(new Error('Internal error'));

            const response = await request(app)
                .post('/files/upload-single')
                .attach('file', 'path/to/local/testfile.txt')
                .field('teacher_id', 1)
                .field('subject_id', 1);

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Internal server error');
        });
    });

    // Tests for getSingleFile
    describe('getSingleFile', () => {
        it('should retrieve a file successfully', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue({
                id: 1,
                filename: 'testfile.txt',
                filepath: 'uploads/testfile.txt',
                teacher_id: 1,
            });
            const downloadSpy = jest.spyOn(fs, 'readFile').mockImplementation((path, name, cb) => cb());

            const response = await request(app)
                .get('/files/1')
                .send({ teacher_id: 1 });

            expect(response.status).toBe(200);
            expect(downloadSpy).toHaveBeenCalledWith(expect.stringContaining('uploads/testfile.txt'), 'testfile.txt', expect.any(Function));
        });

        it('should return 404 if file is not found', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue(null);

            const response = await request(app)
                .get('/files/9999')
                .send({ teacher_id: 1 });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('File not found');
        });

        it('should return 401 if teacher_id does not match', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue({ teacher_id: 2 });

            const response = await request(app)
                .get('/files/1')
                .send({ teacher_id: 1 });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Unauthorized file access');
        });

        it('should return 500 on internal server error', async () => {
            jest.spyOn(File, 'findByPk').mockRejectedValue(new Error('Internal error'));

            const response = await request(app)
                .get('/files/1')
                .send({ teacher_id: 1 });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Internal server error');
        });
    });

    // Tests for renameSingleFile
    describe('renameSingleFile', () => {
        it('should rename a file successfully', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue({
                id: 1,
                filename: 'testfile.txt',
                teacher_id: 1,
                save: jest.fn().mockResolvedValue(),
            });

            const response = await request(app)
                .put('/files/1/rename')
                .send({ new_filename: 'newname', teacher_id: 1 });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('File renamed successfully');
        });

        it('should return 400 for invalid filename', async () => {
            const response = await request(app)
                .put('/files/1/rename')
                .send({ new_filename: 'invalid name!', teacher_id: 1 });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Filename must be alphanumeric and can only contain underscores (_) and hyphens (-)');
        });

        it('should return 404 if file is not found', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue(null);

            const response = await request(app)
                .put('/files/1/rename')
                .send({ new_filename: 'newname', teacher_id: 1 });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('File not found');
        });
    });

    // Tests for deleteSingleFile
    describe('deleteSingleFile', () => {
        it('should delete a file successfully', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue({
                id: 1,
                teacher_id: 1,
                filepath: 'uploads/testfile.txt',
                destroy: jest.fn().mockResolvedValue(),
            });

            fs.unlink.mockImplementation((path, cb) => cb(null));

            const response = await request(app)
                .delete('/files/1')
                .send({ teacher_id: 1 });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('File deleted successfully');
        });

        it('should return 404 if file is not found', async () => {
            jest.spyOn(File, 'findByPk').mockResolvedValue(null);

            const response = await request(app)
                .delete('/files/9999')
                .send({ teacher_id: 1 });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('File not found');
        });
    });
});
