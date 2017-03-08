var mongoose = require('mongoose')

const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId

var oldIdSchema = mongoose.Schema(
  {
    n: String,
    o: String
  }
)

module.exports = mongoose.model('OldId', oldIdSchema)
