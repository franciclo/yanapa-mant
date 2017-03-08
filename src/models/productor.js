const mongoose = require('mongoose')
require('../stocks/model')
require('../productos/model')
require('../precios/model')

const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId

const productorSchema = new Schema({
  name: String,
  users: [String],
  coordinates: [Number],
  precios: [{ type : ObjectId, ref: 'Precio' }],
  stock: [{ type : ObjectId, ref: 'Stock' }],
  tags: [ String ],
}, { collection: 'productores' });

module.exports = mongoose.model('Productor', productorSchema)
