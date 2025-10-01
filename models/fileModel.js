const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Subject = require('./subjectModel');
const Teacher = require('./teacherModel');

const File = sequelize.define('File', {
    fileid: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        defaultValue: sequelize.literal('unique_rowid()'),
        field: 'id'
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'filename'
    },
    filepath: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'file_path'
    },
    teacher_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'teachers',
            key: 'teacherid'
        },
        onDelete: 'CASCADE',
        field: 'teacher_id'
    },
    subject_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'subjects',
            key: 'subjectid'
        },
        onDelete: 'CASCADE',
        field: 'subject_id'
    },
    upload_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    mime_type: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'mime_type'
    },
    size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        field: 'size'
    }
}, {
    tableName: 'files',
    timestamps: false
});

File.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
File.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

module.exports = File;
