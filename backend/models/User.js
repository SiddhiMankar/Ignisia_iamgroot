const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email address',
            ],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
            select: false, // Ensures password is not returned in queries by default
        },
        role: {
            type: String,
            enum: ['faculty', 'admin'],
            default: 'faculty',
        },
        name: {
            type: String,
            trim: true,
            default: 'Faculty Member',
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('User', userSchema);
