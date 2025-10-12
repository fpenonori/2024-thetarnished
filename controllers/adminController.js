const Admin = require("../models/adminModel");
const Teacher = require("../models/teacherModel");
const Subject = require("../models/subjectModel");
const Student = require("../models/studentModel");
const SubjectTeacher = require("../models/subjectTeacherModel");
const Schedule = require("../models/weeklyScheduleModel");
const dayjs = require("dayjs");
const { checkUpcomingMeetings } = require("../jobs/meetingReminder");
const { replenishMonthlySchedules } = require("../jobs/replenishMonthlySchedules");
const { faker } = require("@faker-js/faker");
const fs = require("fs");
const bcrypt = require("bcrypt");
const sequelize = require("../config/database");
const { ensureTeacherSchedule } = require("../helpers/teacherScheduleHelper");

const DEFAULT_SEED_SCHEDULE = [
  { start_time: "14:00", end_time: "15:00", dayofweek: 1, maxstudents: 1 },
  { start_time: "15:00", end_time: "16:00", dayofweek: 1, maxstudents: 3 },
  { start_time: "14:00", end_time: "15:00", dayofweek: 2, maxstudents: 1 },
  { start_time: "15:00", end_time: "16:00", dayofweek: 2, maxstudents: 3 },
  { start_time: "14:00", end_time: "15:00", dayofweek: 3, maxstudents: 1 },
  { start_time: "15:00", end_time: "16:00", dayofweek: 3, maxstudents: 3 },
  { start_time: "14:00", end_time: "15:00", dayofweek: 4, maxstudents: 1 },
  { start_time: "15:00", end_time: "16:00", dayofweek: 4, maxstudents: 3 },
  { start_time: "14:00", end_time: "15:00", dayofweek: 5, maxstudents: 1 },
  { start_time: "15:00", end_time: "16:00", dayofweek: 5, maxstudents: 3 },
  { start_time: "14:00", end_time: "15:00", dayofweek: 6, maxstudents: 1 },
  { start_time: "15:00", end_time: "16:00", dayofweek: 6, maxstudents: 3 },
  { start_time: "14:00", end_time: "15:00", dayofweek: 7, maxstudents: 1 },
  { start_time: "15:00", end_time: "16:00", dayofweek: 7, maxstudents: 3 },
];

const DEFAULT_PASSWORD = "qwer123$";

const wipeAllModeledTables = async (req, res) => {

  const tables = [
    "admins",
    "subjects",
    "choices",
    "exams",
    "file_access",
    "files",
    "meetings",
    "messages",
    "monthlyschedule",
    "questions",
    "reservations",
    "students",
    "subjects",
    "subjectteacher",
    "teachers",
    "weeklyschedule",
  ];

  const t = await sequelize.transaction();
  try {
    for (const tbl of tables) {
      await sequelize.query(`TRUNCATE TABLE "${tbl}" CASCADE;`, {
        transaction: t,
      });
    }

    await t.commit();
    return res.status(200).json({ ok: true, truncatedTables: tables });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ ok: false, error: err.message });
  }
};

const populateDB = async (req, res) => {
  const TEST_PASSWORD = "qwer123$";

  const hashed_password = await bcrypt.hash(TEST_PASSWORD, 10);

  const seedTeachers = [
    {
      firstname: "Eva",
      lastname: "Slinin",
      email: "fpenonori.aws@gmail.com",
      password: hashed_password,
      is_active: true,
    },
    {
      firstname: "Santi",
      lastname: "Falso",
      email: "santifalso9@gmail.com",
      password: hashed_password,
      is_active: true,
    },
  ];

  const seedStudents = [
    {
      firstname: "Francisco",
      lastname: "Penonori",
      email: "fpenonori@gmail.com",
      password: hashed_password,
    },
    {
      firstname: "Santi",
      lastname: "DiLiscia",
      email: "santidiliscia@gmail.com",
      password: hashed_password,
    },
  ];

  let sample_teachers = [...seedTeachers];

  const generateTeacher = (idx) => {
    return {
      id: idx + 1,
      firstname: faker.person.firstName(),
      lastname: faker.person.lastName(),
      email: faker.internet.email(),
      password: hashed_password,
      is_active: true,
    };
  };

  const SAMPLE_TEACHER_AMOUNT = 10;
  for (let i = 0; i < SAMPLE_TEACHER_AMOUNT; i++) {
    sample_teachers.push(generateTeacher(i));
  }

  let sample_students = [...seedStudents];
  const generateStudent = (idx) => {
    return {
      id: idx + 1,
      firstname: faker.person.firstName(),
      lastname: faker.person.lastName(),
      email: faker.internet.email(),
      password: hashed_password,
    };
  };

  const SAMPLE_STUDENT_AMOUNT = 10;
  for (let i = 0; i < SAMPLE_STUDENT_AMOUNT; i++) {
    sample_students.push(generateStudent(i));
  }

  const subject_names = [
    "Mathematics",
    "Mathematics II",
    "Applied Calculus",
    "Numeric Methods",
    "Discrete Mathematics",
    "Data Structures",
    "Networking Fundamentals",
    "Operating Systems",
    "Compiler Design",
  ];
  const sample_subjects = subject_names.map((name, idx) => ({
    subjectid: idx + 1,
    subjectname: name,
  }));

  const result = await sequelize.transaction(async (t) => {
    await Subject.bulkCreate(sample_subjects, {
      ignoreDuplicates: true,
      transaction: t,
    });

    await Teacher.bulkCreate(sample_teachers, {
      updateOnDuplicate: ["firstname", "lastname", "is_active", "password"],
      transaction: t,
    });

    await Student.bulkCreate(sample_students, {
      updateOnDuplicate: ["firstname", "lastname", "password"],
      transaction: t,
    });

    const [teachers, subjects] = await Promise.all([
      Teacher.findAll({ attributes: ["teacherid"], transaction: t }),
      Subject.findAll({ attributes: ["subjectid"], transaction: t }),
    ]);

    const teacherIds = teachers.map((r) => r.teacherid);
    const subjectIds = subjects.map((r) => r.subjectid);

    const teacherSubjectRows = teacherIds.map((tid) => ({
      teacherid: tid,
      subjectid: subjectIds[Math.floor(Math.random() * subjectIds.length)],
    }));

    await SubjectTeacher.bulkCreate(teacherSubjectRows, {
      ignoreDuplicates: true,
      transaction: t,
    });

    return {
      teachersInserted: teacherIds.length,
      studentsInserted: await Student.count({ transaction: t }),
      subjectsInserted: subjectIds.length,
      teacherSubjectLinks: teacherSubjectRows.length,
    };
  });

  return res.status(200).json({ message: result });
};

const seedTeacherSchedule = async (_req, res) => {
  try {
    const teachers = await Teacher.findAll({
      attributes: ["teacherid", "is_active"],
    });

    const seeded = [];

    for (const teacher of teachers) {
      if (!teacher.is_active) {
        continue;
      }

      const teacherid = teacher.teacherid;
      const existingCount = await Schedule.count({ where: { teacherid } });

      if (existingCount > 0) {
        continue;
      }

      const weeklySlots = await ensureTeacherSchedule({
        teacherid,
        schedule: DEFAULT_SEED_SCHEDULE,
      });

      seeded.push({
        teacherid,
        createdSlots: weeklySlots.length,
      });
    }

    if (seeded.length === 0) {
      return res
        .status(200)
        .json({ message: "No teachers required schedule seeding" });
    }

    return res.status(201).json({ seeded });
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
  }
};

const activateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    const teacherId = teacher.teacherid;
    await Teacher.update({ is_active: true }, { where: { teacherid: id } });
    res.status(200).json({ message: "Teacher activated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const disableTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    teacher.is_active = false;
    await teacher.save();
    res.status(200).json({ message: "Teacher disabled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const getInactiveTeachers = async (req, res) => {
  try {
    const inactiveTeachers = await Teacher.findAll({
      attributes: [
        "teacherid",
        "firstname",
        "lastname",
        "email",
        "signup_date",
        "is_active",
      ],
      where: { is_active: false },
      order: [["signup_date", "ASC"]],
    });

    if (!inactiveTeachers.length) {
      return res.status(404).json({ message: "No inactive teachers found" });
    }
    const formattedTeachers = inactiveTeachers.map((teacher) => {
      const formattedDate = dayjs(teacher.signup_date).format(
        "DD-MM-YYYY, HH:mm"
      );

      return {
        teacherid: teacher.teacherid,
        firstname: teacher.firstname,
        lastname: teacher.lastname,
        email: teacher.email,
        signup_date: formattedDate,
        is_active: teacher.is_active,
      };
    });

    res.status(200).json(formattedTeachers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const testCron = async (req, res) => {
  try {
    await checkUpcomingMeetings();
    await replenishMonthlySchedules();
    res.status(200).json({ message: "OK" });
  } catch (error) {
    res.status(500).json({
      message: "Cron job execution failed",
      error: error.message,
    });
  }
};

module.exports = {
  activateTeacher,
  disableTeacher,
  getInactiveTeachers,
  testCron,
  populateDB,
  seedTeacherSchedule,
  wipeAllModeledTables,
};
