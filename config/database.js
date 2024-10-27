require('dotenv').config();
const { Sequelize } = require('sequelize');

//LO HARDCODEO XQ NO LO ESTA TOMANDO DE  .ENV
const sequelize = new Sequelize(process.env.CONNECTION_STRING, {
    logging: false,
});
// const sequelize = new Sequelize(process.env.CONNECTION_STRING, {
//     logging: false,
// });

module.exports = sequelize;