const { DataTypes } = require('sequelize');
const validator = require('validator');
const sequelize = require('../config/database');
const Reservation = require('./reservationModel');

const Meeting = sequelize.define(
    'Meeting',
    {
        meetingId: {
            type: DataTypes.STRING(64),
            primaryKey: true,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: {
                    msg: 'Meeting ID is required',
                },
            },
        },
        topic: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Topic is required',
                },
            },
        },
        startTime: {
            type: DataTypes.DATE,
            allowNull: false,
            validate: {
                isDate: true,
            },
        },
        joinUrl: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                isValidUrl(value) {
                    if (!validator.isURL(value || '', { require_protocol: true })) {
                        throw new Error('Join URL must be a valid URL');
                    }
                },
            },
        },
        zoomId: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING(128),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Password is required',
                },
            },
        },
        reservation_id: {  
            type: DataTypes.BIGINT,
            allowNull: true,  
            references: {
            model: Reservation,
            key: 'id',
            },
            onDelete: 'SET NULL', 
        },
    },
    {
        tableName: 'meetings',
        underscored: true,
        timestamps: false,
    },
    
);

module.exports = Meeting;
