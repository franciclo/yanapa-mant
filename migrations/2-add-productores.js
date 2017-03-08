'use strict';

module.exports.id = "add-productores";

module.exports.up = function (done) {
  // var Producto =  this.db.collection('productos')
  // var Stock = this.db.collection('stocks')
  var Productor = this.db.collection('productores')
  var log =  this.log

  this.db.collection('users')
    .find({arboles: {$ne: []}})
    .toArray(function (err, users) {
      if (err) {
        console.log('get users con arboles fail', err)
        done()
      }

      let usersProductores = users.map(user => {
        const location = JSON.parse(user.location)
        return {
          coordinates: [ +location.lng, +location.lat ],
          users: [ user._id ],
          name: getNombre(user)
        }
      })

      Productor.insertMany(usersProductores)
        .then(function() {
          log('Productores creados')
          done()
        })
        .catch(function(err){
          console.log('Productores error', err)
          done()
        })
    })
};

module.exports.down = function (done) {
  var log =  this.log
  var Productores = this.db.collection('productores')

  Productores.deleteMany({})
    .then(function() {
      log('Productores eliminados', err)
      done()
    })
    .catch(function(err) {
      log('Productores delete error', err)
      done()
    })
}

function getNombre (user) {
  var userName = 'Sin nombre'
  if (user.name) {
    userName = user.name
  } else if (user.local && user.local.name) {
    userName = user.local.name
  } else if (user.google && user.google.name) {
    userName = user.google.name
  } else if (user.twitter && user.twitter.displayName) {
    userName = user.twitter.displayName
  } else if (user.facebook && user.facebook.name) {
    userName = user.facebook.name
  }
  return userName
}
