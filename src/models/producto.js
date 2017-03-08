const mongoose = require('mongoose')

const productoSchema = mongoose.Schema({
  name: String,
  tags: [ String ]
})

module.exports = mongoose.model('Producto', productoSchema)
