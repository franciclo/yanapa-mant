var mongoose = require('mongoose')

var userSchema = mongoose.Schema({
  userType: String,
  location: String,
  name: String,
  arboles: [
    {
      tamagno: String,
      cantidad: Number,
      especie: String
    }
  ],
  primerLogin: {
    type: Boolean,
    default: true
  },
  email: String,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  emailVerificationSent: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  localRegistry: {
    type: Boolean,
    default: false
  },
  unofficialPassword: String,
  local: {
    email: String,
    password: String,
    name: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date
  },
  facebook: {
    id: String,
    token: String,
    email: String,
    name: String
  },
  twitter: {
    id: String,
    token: String,
    displayName: String,
    username: String
  },
  google: {
    id: String,
    token: String,
    email: String,
    name: String
  }

})

module.exports = mongoose.model('User', userSchema)
