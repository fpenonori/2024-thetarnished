const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Subject = require('./subjectModel');
const Teacher = require('./teacherModel');

const File = sequelize.define('File', {
    fileid: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    filepath: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    teacher_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'teachers',
            key: 'teacherid',
        },
        onDelete: 'CASCADE',
    },
    subject_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'subjects',
            key: 'subjectid',
        },
        onDelete: 'CASCADE',
    },
    upload_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'files',
    timestamps: false
});

File.belongsTo(Teacher, {foreignKey: 'teacher_id', as: 'teacher'});
File.belongsTo(Subject, {foreignKey: 'subject_id', as: 'subject'});


module.exports = File;