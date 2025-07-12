
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true // Ensures email is unique
    },
    role: { // Added role field with enum for 'user' or 'admin'
        type: String,
        enum: ['user', 'admin'], // Allowed values for role
        default: 'user', // Default role for new users
        required: true
    }
});

userSchema.plugin(passportLocalMongoose); // This plugin adds username and password fields

module.exports = mongoose.model('User', userSchema);