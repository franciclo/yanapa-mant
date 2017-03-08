const mongoose = require('mongoose')

const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId

const stockSchema = new Schema(
  {
    producto: { type : ObjectId, ref: 'Producto' },
    cantidad: Number
  }
)

module.exports = mongoose.model('Stock', stockSchema)
