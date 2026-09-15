const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

userSchema.methods.comparePassword = async function (candidate) {
  const bcrypt = require("bcryptjs");
  return bcrypt.compare(candidate, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);
