import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    isSubscribed: { type: Boolean, default: false },
    likedBooks: { type: [String], default: [] }, // Array of book IDs
});

const User = mongoose.model('User', userSchema);
export default User;
