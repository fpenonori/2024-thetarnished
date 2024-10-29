const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FileAccess = sequelize.define('FileAccess', {
    accessid: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    student_id: {
        type: DataTypes.BIGINT,
        references: {
            model: 'Students',
            key: 'studentid'
        },
        onDelete: 'CASCADE'
    },
    file_id: {
        type: DataTypes.BIGINT,
        references: {
            model: 'Files',
            key: 'fileid'
        },
        onDelete: 'CASCADE'
    },
    granted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'file_access',
    timestamps: false
});

module.exports = FileAccess;
