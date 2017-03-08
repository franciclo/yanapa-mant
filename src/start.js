const mongoose = require('mongoose')

require('dotenv').config()
mongoose.connect(process.env.MONGODB_URI)
mongoose.Promise = Promise

const db = mongoose.connection

db.on('error', (err) => console.log('mongoose connection error: ' + err.message))

console.log('mantenimiento yanapa started')
