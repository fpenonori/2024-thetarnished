const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FileAccess = sequelize.define('FileAccess', {
    accessid: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
        defaultValue: sequelize.literal('unique_rowid()')
    },
    student_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'students',
            key: 'studentid'
        },
        onDelete: 'CASCADE',
        field: 'student_id'
    },
    file_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'files',
            key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'file_id'
    },
    granted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'granted_at'
    }
}, {
    tableName: 'file_access',
    timestamps: false
});

module.exports = FileAccess;
