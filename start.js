var pg = require('pg')

var config = {
  user: 'pgadmin',
  database: 'pgadmin',
  password: 'pgadmin',
  host: 'localhost',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000
}

var client = new pg.Client(config)

client.connect(function (err) {
  if (err) throw err

  return client.query('DROP DATABASE IF EXISTS yanapa;')
    .then(() => client.query('CREATE DATABASE yanapa;'))
    .then(() => { console.log('database created') })
    .catch((err) => { console.log(err) })
})

console.log('+++++++++++++++++++++++++++++++++++++')
console.log('          yanapa mant started')
console.log('+++++++++++++++++++++++++++++++++++++')
