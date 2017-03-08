var mongoose = require('mongoose')

const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId

var precioSchema = mongoose.Schema(
  {
    producto: { type : ObjectId, ref: 'Producto' },
    precio: Number
  }
)

module.exports = mongoose.model('Precio', precioSchema)
