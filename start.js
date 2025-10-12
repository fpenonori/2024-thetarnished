const sequelize = require('./config/database');
const app = require('./app');
const cronjob = require('./cron');

sequelize.sync()
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));
    console.log('DB on');
    cronjob()
    console.log('Cronjob started executing')
  })
  .catch((err) => {
    console.error('Error:', err);
  });