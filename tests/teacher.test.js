const request = require('supertest');
const app = require('../app');
const Teacher = require('../models/teacherModel');

describe('Teacher API', () => {
   

  it('Should create a new teacher', async () => {
    const response = await request(app)
      .post('/teachers/register')
      .send({
        firstname: 'Dr. Turanza',
        lastname: 'Turanza',
        email: 'turanza@asd.com',
        password: 'password',
      });
  
    expect(response.status).toBe(201);
    expect(response.body.email).toBe('turanza@asd.com');
  
  });

  it('Should get a teacher by id', async () => {
    const createdTeacher = await Teacher.create({
      firstname: 'Prof. Peñoñori',
      lastname: 'Peñoñori',
      email: 'peñoñori@asd.com',
      password: 'password',
    });
  
    const response = await request(app)
      .get(`/teachers/${createdTeacher.teacherid}`);
  
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('peñoñori@asd.com');
  });

  it('Should not get a teacher by invalid id', async () => {
    const response = await request(app)
      .get('/teachers/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Teacher not found');
  });

  it('Should not create a teacher with invalid email', async () => {
    const response = await request(app)
      .post('/teachers/register')
      .send({
        name: 'Invalid',
        lastname: 'Invalid',
        subjects: [],
        email: 'invalidemail',
        password: 'password',
      });
  
    expect(response.status).toBe(400);
  });

  it("Should update teacher's name", async () => {
    const teacher = await Teacher.create({
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@example.com',
      password: 'password',
    });

    const updatedTeacherData = {
      firstname: 'juancito',
      lastname: teacher.lastname,
    };

    const response = await request(app)
      .put(`/teachers/update/${teacher.teacherid}`)
      .send(updatedTeacherData);

    expect(response.status).toBe(200);
    expect(response.body.firstname).toBe('juancito');
  });

  it("Should delete a teacher", async () => {
    const teacher = await Teacher.create({
      firstname: 'John',
      lastname: 'Doe',
      email: 'juan@asd.com',
      password: '123',
    });
    const response = await request(app)
    .delete(`/teachers/delete/${teacher.teacherid}`)

    expect(response.status).toBe(200);

    const teacherFound = await Teacher.findByPk(teacher.id);
    expect(teacherFound).toBeNull();
  });

  it("Should not be possible to update a teacher with invalid id", async () => {
    const response = await request(app)
      .put('/teachers/update/999')
      .send({
        name: 'Invalid',
        lastname: 'Invalid',
        subjects: [],
      });
      expect(response.status).toBe(404);
  });

  it("Should not be possible to delete a teacher with invalid id", async () => {
    const response = await request(app)
    .delete('/teachers/delete/999');
    expect(response.status).toBe(404);
  });
});
