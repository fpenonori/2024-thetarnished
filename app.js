const express = require('express');
const path = require('path');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const autenthicationRoutes = require('./routes/authenticationRoutes'); 
const scheduleRoutes = require('./routes/weeklyScheduleRoutes');
const resetRoutes = require('./routes/resetRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const monthlyScheduleRoutes = require('./routes/monthlyScheduleRoutes');
const adminRoutes = require('./routes/adminRoutes');
const examRoutes = require('./routes/examRoutes');
const fileRoutes = require('./routes/fileRoutes');
const fileAccessRoutes = require('./routes/fileAccessRoutes');
const defineAssociations = require('./models/associations');
const cors = require('cors');
const fs = require('node:fs');
const multer = require('multer');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://linkandlearn.fpenonori.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

defineAssociations();
app.use(express.json());
app.use('/reset', resetRoutes);
app.use('/students', studentRoutes);
app.use('/teachers', teacherRoutes);
app.use('/authentication', autenthicationRoutes);
app.use('/subject', subjectRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/reservation', reservationRoutes);
app.use('/classes', monthlyScheduleRoutes);
app.use('/admins', adminRoutes);
app.use('/exam', examRoutes);
app.use('/file', fileRoutes);
app.use('/file-access', fileAccessRoutes);


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.use((err, req, res, next) => {
  // Handle Multer file size limit errors
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File size exceeds the limit.' });
  }
  console.error(err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

module.exports = app;
