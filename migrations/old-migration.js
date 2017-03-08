const express = require('express')
const User = require('./model')
const Vivero = require('../viveros/model')
const router = express.Router()

router.get('/viveros', function(req, res) {
  function tamagno (n) {
    switch (n) {
      case '1':
       return 'brote'
      case '2':
       return 'plantin'
      case '3':
       return 'mediano'
      case '4':
       return 'maduro'
      case '5':
       return 'grande'
      default:
       throw new Error('tamaño desconocido')
    }
  }

  User.find({emailVerified: true, arboles: { $ne: [] }}, function(err, users) {
    if(err) return res.json({err: err.message})
    Vivero.remove({}, function(err) {
      if(err) return res.json({err: err.message})

      let usersViveros = users.map(user => {
        const location = JSON.parse(user.location)
        return {
          geometry: {
            coordinates: [+location.lng, +location.lat]
          },
          properties: {
            user: user.id,
            stock: user.arboles.reduce((stock, arbol) => {
              const arbolI = stock
                .map(arbol => arbol.especie)
                .indexOf(arbol.especie)

              if(~arbolI) {
                stock[arbolI].cantidades.push({
                  tipo: tamagno(arbol.tamagno),
                  cantidad: arbol.cantidad
                })
              } else {
                let newArbol = {
                  especie: arbol.especie,
                  cantidades: []
                }

                newArbol.cantidades.push({
                  tipo: tamagno(arbol.tamagno),
                  cantidad: arbol.cantidad
                })

                stock.push(newArbol)
              }

              return stock
            }, [])
          }
        }
      })

      usersViveros.forEach(vivero => {
        const newVivero = new Vivero(vivero)
        newVivero.save(err => { if(err) throw new Error(err) })
      })

      res.json(usersViveros)
    })
  })
})

router.get('/viveros/map', function(req, res) {
  Vivero.find({}, function(err, viveros) {
    if(err) return res.json({err: err.message})
    let viverosMap = {
      type: 'FeatureCollection',
      features: viveros.map(vivero => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: vivero.geometry.coordinates
          },
          properties: {
            id: vivero.id
          }
        })
      )
    }
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename=viveros.geojson')
    res.end(JSON.stringify(viverosMap))
    // res.json(viverosMap)
  })
})

module.exports = router
