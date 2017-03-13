//
// usar uuid ids | cantidades no anda
//
var MongoClient = require('mongodb').MongoClient
var pg = require('pg')

var config = {
  user: 'pgadmin',
  database: 'yanapa',
  password: 'pgadmin',
  host: 'localhost',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000
}

var pool = new pg.Pool(config)

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

const mapPromise = (fn) => (arr) => Promise.all(arr.map(fn))

const updateStocks = (stocks) => {
  return Promise.all(stocks
    .filter((s) => s.especie)
    .reduce((newStocks, stock) => {
      const arbolI = newStocks.map((group) => group.especie).indexOf(stock.especie)
      if (~arbolI) {
        newStocks[arbolI].cantidad += stock.cantidad
      } else {
        let newArbol = {
          especie: stock.especie,
          cantidad: stock.cantidad
        }
        newStocks.push(newArbol)
      }
      return newStocks
    }, [])
    .map((stock) => {
      return pool.query('SELECT * FROM productos_old_new WHERE old_id = $1', [stock.especie])
        .then((result) => {
          return Promise.resolve({
            producto: result.rows[0].new_id,
            cantidad: stock.cantidad
          })
        })
    }))
}

let utilIds = {}

module.exports = (function (v) {
  pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    .then(() => Promise.all([
      pool.query('DROP TABLE IF EXISTS etiquetas_stocks;'),
      pool.query('DROP TABLE IF EXISTS etiquetas_producciones;'),
      pool.query('DROP TABLE IF EXISTS etiquetas_productos;'),
      pool.query('DROP TABLE IF EXISTS produccion_staff;'),
      pool.query('DROP TABLE IF EXISTS productos_old_new;')
    ]))
    .then(() => pool.query('DROP TABLE IF EXISTS stocks;'))
    .then(() => Promise.all([
      pool.query('DROP TABLE IF EXISTS etiquetas;'),
      pool.query('DROP TABLE IF EXISTS producciones;'),
      pool.query('DROP TABLE IF EXISTS productos;')
    ]))
    .then(() => pool.query('DROP TABLE IF EXISTS unidades;'))
    .then(() => pool.query(`CREATE TABLE unidades (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4 () NOT NULL,
        singular VARCHAR (100),
        plural VARCHAR (100)
      )`)
    )
    .then(() => {
      return Promise.all([
        pool.query(`CREATE TABLE producciones (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4 () NOT NULL,
          nombre VARCHAR (100) NOT NULL
        )`),
        pool.query(`CREATE TABLE productos (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4 () NOT NULL,
          unidad_id uuid NOT NULL,
          nombre VARCHAR (100) NOT NULL,
          FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE CASCADE
        )`)
      ])
    })
    .then(() => {
      return Promise.all([
        pool.query(`CREATE TABLE stocks (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4 () NOT NULL,
          produccion_id uuid NOT NULL,
          producto_id uuid NOT NULL,
          cantidad int,
          FOREIGN KEY (produccion_id) REFERENCES producciones(id) ON DELETE CASCADE,
          FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
        )`),
        pool.query(`CREATE TABLE produccion_staff (
          produccion_id uuid NOT NULL,
          a0id VARCHAR (100) UNIQUE NOT NULL,
          FOREIGN KEY (produccion_id) REFERENCES producciones(id) ON DELETE CASCADE
        )`),
        pool.query(`CREATE TABLE etiquetas (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4 () NOT NULL,
          text VARCHAR (255)
        )`)
      ])
    })
    .then(() => {
      return Promise.all([
        pool.query(`CREATE TABLE etiquetas_producciones (
            etiqueta_id uuid NOT NULL,
            produccion_id uuid NOT NULL,
            PRIMARY KEY (etiqueta_id, produccion_id),
            FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON UPDATE CASCADE,
            FOREIGN KEY (produccion_id) REFERENCES producciones(id) ON UPDATE CASCADE
        )`),
        pool.query(`CREATE TABLE etiquetas_productos (
            etiqueta_id uuid NOT NULL,
            producto_id uuid NOT NULL,
            PRIMARY KEY (etiqueta_id, producto_id),
            FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON UPDATE CASCADE,
            FOREIGN KEY (producto_id) REFERENCES productos(id) ON UPDATE CASCADE
        )`),
        pool.query(`CREATE TABLE etiquetas_stocks (
            etiqueta_id uuid NOT NULL,
            stock_id uuid NOT NULL,
            PRIMARY KEY (etiqueta_id, stock_id),
            FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON UPDATE CASCADE,
            FOREIGN KEY (stock_id) REFERENCES stocks(id) ON UPDATE CASCADE
        )`),
        pool.query(`CREATE TABLE productos_old_new (
            old_id int UNIQUE NOT NULL,
            new_id uuid UNIQUE NOT NULL
        )`)
      ])
    })
    .then(function () {
      Promise.all([
        pool.query("INSERT INTO unidades (plural, singular) VALUES ('plantines', 'plantin') RETURNING id"),
        pool.query("INSERT INTO etiquetas (text) VALUES ('nativo') RETURNING id"),
        pool.query("INSERT INTO etiquetas (text) VALUES ('comestible') RETURNING id"),
        pool.query("INSERT INTO etiquetas (text) VALUES ('vivero') RETURNING id")
      ])
      .then((results) => {
        utilIds = {
          unidad: results[0].rows[0].id,
          nativo: results[1].rows[0].id,
          comestible: results[2].rows[0].id,
          vivero: results[3].rows[0].id
        }
        return mapPromise((producto) => {
          return pool.query('INSERT INTO productos (nombre, unidad_id) VALUES ($1, $2) RETURNING id', [producto.label, utilIds.unidad])
            .then((result) => {
              let newId = result.rows[0].id
              return Promise.all([
                pool.query('INSERT INTO etiquetas_productos (etiqueta_id, producto_id) VALUES ($1, $2)', [utilIds[producto.tipo], newId]),
                pool.query('INSERT INTO productos_old_new (old_id, new_id) VALUES ($1, $2)', [producto.id, newId])
              ])
            })
        })(productosData)
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          MongoClient.connect('mongodb://localhost:27017/yanapa', function (err, db) {
            if (err) return reject('mongodb connection error' + JSON.stringify(err))
            resolve(db)
          })
        })
      })
      .then((db) => db.collection('users')
        .find({})
        .toArray()
      )
      .then((users) => Promise.resolve(users.filter((u) => u.arboles && u.arboles.length > 0)))
      .then(mapPromise(function (user) {
        return pool.query('INSERT INTO producciones (nombre) VALUES ($1) RETURNING id', [getNombre(user)])
          .then(function (result) {
            const newID = result.rows[0].id
            return Promise.all([
              pool.query('INSERT INTO produccion_staff (produccion_id, a0id) VALUES ($1, $2)', [newID, user._id]),
              pool.query('INSERT INTO etiquetas_producciones (produccion_id, etiqueta_id) VALUES ($1, $2)', [newID, utilIds.vivero]),
              updateStocks(user.arboles)
            ])
            .then((results) => {
              let newStocks = results[2]
              return mapPromise((stock) => {
                return pool.query('INSERT INTO stocks (produccion_id, producto_id, cantidad) VALUES ($1, $2, $3)', [newID, stock.producto, stock.cantidad])
              })(newStocks)
            })
          })
      }))
      .then(() => pool.query('DROP TABLE IF EXISTS productos_old_new;'))
      .then(() => {
        console.log('seed complete')
      })
      .catch((err) => {
        console.log('seed failed')
        console.log(err)
      })
    })
}())

var productosData = [
  {
    'id' : '1',
    'label' : 'Aguaribay',
    'latin' : 'Schinus areira',
    'tipo' : 'nativo'
  },
  {
    'id' : '2',
    'label' : 'Algarrobo',
    'latin' : 'Prosopis Alba',
    'tipo' : 'nativo'
  },
  {
    'id' : '3',
    'label' : 'Chañar',
    'latin' : 'Geoffrea decorticans',
    'tipo' : 'nativo'
  },
  {
    'id' : '4',
    'label' : 'Coronillo',
    'latin' : 'Scutia buxifolia',
    'tipo' : 'nativo'
  },
  {
    'id' : '5',
    'label' : 'Espinillo',
    'latin' : 'Acacia caven',
    'tipo' : 'nativo'
  },
  {
    'id' : '6',
    'label' : 'Sen de Campo',
    'latin' : 'Senna corymbosa',
    'tipo' : 'nativo'
  },
  {
    'id' : '7',
    'label' : 'Sombra de Toro',
    'latin' : 'Jodinia rhombifolia',
    'tipo' : 'nativo'
  },
  {
    'id' : '8',
    'label' : 'Tala',
    'latin' : 'Celtis ehrenbergiana',
    'tipo' : 'nativo'
  },
  {
    'id' : '9',
    'label' : 'Algodonillo',
    'latin' : 'Aeschynomene montevidensis',
    'tipo' : 'nativo'
  },
  {
    'id' : '10',
    'label' : 'Anacahuita',
    'latin' : 'Blepharocalyx salicifolius',
    'tipo' : 'nativo'
  },
  {
    'id' : '11',
    'label' : 'Azota Caballo',
    'latin' : 'Luehea divaricata',
    'tipo' : 'nativo'
  },
  {
    'id' : '12',
    'label' : 'Blanquillo',
    'latin' : 'Sebastania commersoniana',
    'tipo' : 'nativo'
  },
  {
    'id' : '13',
    'label' : 'Bugre',
    'latin' : 'Lonchocarpus nitidus',
    'tipo' : 'nativo'
  },
  {
    'id' : '14',
    'label' : 'Canelón',
    'latin' : 'Myrsine laetevirens',
    'tipo' : 'nativo'
  },
  {
    'id' : '15',
    'label' : 'Carpinchera',
    'latin' : 'Mimosa pigra',
    'tipo' : 'nativo'
  },
  {
    'id' : '16',
    'label' : 'Ceibo',
    'latin' : 'Erytrina crista galli',
    'tipo' : 'nativo'
  },
  {
    'id' : '17',
    'label' : 'Chal Chal',
    'latin' : 'Allophyllus edulis',
    'tipo' : 'nativo'
  },
  {
    'id' : '18',
    'label' : 'Curupí',
    'latin' : 'Sapium haematospernum',
    'tipo' : 'nativo'
  },
  {
    'id' : '19',
    'label' : 'Durasznillo Blanco',
    'latin' : 'Solanum glaucophyllum',
    'tipo' : 'nativo'
  },
  {
    'id' : '20',
    'label' : 'Flor de Seda',
    'latin' : 'Calliandra parvifolia',
    'tipo' : 'nativo'
  },
  {
    'id' : '21',
    'label' : 'Fumo Bravo',
    'latin' : 'Solanun granuloso-leprosum',
    'tipo' : 'nativo'
  },
  {
    'id' : '22',
    'label' : 'Higuerón',
    'latin' : 'Ficus luschnathiana',
    'tipo' : 'nativo'
  },
  {
    'id' : '23',
    'label' : 'Ingá',
    'latin' : 'Inga urugaensis',
    'tipo' : 'nativo'
  },
  {
    'id' : '24',
    'label' : 'Laurel Criollo',
    'latin' : 'Ocotea acutifolia',
    'tipo' : 'nativo'
  },
  {
    'id' : '25',
    'label' : 'Mata Ojo',
    'latin' : 'Pouteria salicifolia',
    'tipo' : 'nativo'
  },
  {
    'id' : '26',
    'label' : 'Murta',
    'latin' : 'Myrceugenia glaucescens',
    'tipo' : 'nativo'
  },
  {
    'id' : '27',
    'label' : 'Ombú',
    'latin' : 'Phitolacca dioica',
    'tipo' : 'nativo'
  },
  {
    'id' : '28',
    'label' : 'Palo Amarillo',
    'latin' : 'Terminalia australis',
    'tipo' : 'nativo'
  },
  {
    'id' : '29',
    'label' : 'Pindó',
    'latin' : 'Arecastrum romanzoffianum',
    'tipo' : 'nativo'
  },
  {
    'id' : '30',
    'label' : 'Rama Negra',
    'latin' : 'Mimosa bonplandii',
    'tipo' : 'nativo'
  },
  {
    'id' : '31',
    'label' : 'Rosa de Río',
    'latin' : 'Hibiscus cisplatinus',
    'tipo' : 'nativo'
  },
  {
    'id' : '32',
    'label' : 'Salvia Azul',
    'latin' : 'Salvia guaranítica',
    'tipo' : 'nativo'
  },
  {
    'id' : '33',
    'label' : 'Sarandí Blanco',
    'latin' : 'Phyllanthus sellowianus',
    'tipo' : 'nativo'
  },
  {
    'id' : '34',
    'label' : 'Sarandí Colorado',
    'latin' : 'Cephalanthus glabratus',
    'tipo' : 'nativo'
  },
  {
    'id' : '35',
    'label' : 'Sauce Criollo',
    'latin' : 'Salix humboldtiana',
    'tipo' : 'nativo'
  },
  {
    'id' : '36',
    'label' : 'Sauco',
    'latin' : 'Sambucus australis',
    'tipo' : 'nativo'
  },
  {
    'id' : '37',
    'label' : 'Tarumá',
    'latin' : 'Citharexylum montevidense',
    'tipo' : 'nativo'
  },
  {
    'id' : '38',
    'label' : 'Tasi',
    'latin' : 'Araujia sericifera',
    'tipo' : 'nativo'
  },
  {
    'id' : '39',
    'label' : 'Tembetarí',
    'latin' : 'Fagara rhoifolia',
    'tipo' : 'nativo'
  },
  {
    'id' : '40',
    'label' : 'Timbó',
    'latin' : 'Enterolobium contortisiliquum',
    'tipo' : 'nativo'
  },
  {
    'id' : '41',
    'label' : 'Barba de Chivo',
    'latin' : 'Caesalpinia gilliesii',
    'tipo' : 'nativo'
  },
  {
    'id' : '42',
    'label' : 'Carquejilla',
    'latin' : 'Baccharis notesergila',
    'tipo' : 'nativo'
  },
  {
    'id' : '43',
    'label' : 'Ceibillo',
    'latin' : 'Sesbania punicea',
    'tipo' : 'nativo'
  },
  {
    'id' : '44',
    'label' : 'Hediondillo',
    'latin' : 'Cestrum parqui',
    'tipo' : 'nativo'
  },
  {
    'id' : '45',
    'label' : 'Lantana',
    'latin' : 'Lantana megapotamica',
    'tipo' : 'nativo'
  },
  {
    'id' : '46',
    'label' : 'Malva Blanca',
    'latin' : 'Sphaeralcea Bonariensis',
    'tipo' : 'nativo'
  },
  {
    'id' : '47',
    'label' : 'Malva de Monte',
    'latin' : 'Pavonia Sepium',
    'tipo' : 'nativo'
  },
  {
    'id' : '48',
    'label' : 'Malvavisco',
    'latin' : 'Sphaeralcea Bonariensis',
    'tipo' : 'nativo'
  },
  {
    'id' : '49',
    'label' : 'Molle',
    'latin' : 'Schinus longifolius',
    'tipo' : 'nativo'
  },
  {
    'id' : '50',
    'label' : 'Pavonia',
    'latin' : 'Pavonia Hastata',
    'tipo' : 'nativo'
  },
  {
    'id' : '51',
    'label' : 'Banano',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '52',
    'label' : 'Castaño',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '53',
    'label' : 'Ciruelo',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '54',
    'label' : 'Damasco',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '55',
    'label' : 'Duraznero',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '56',
    'label' : 'Higuera',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '57',
    'label' : 'Limonero',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '58',
    'label' : 'Membrillero',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '59',
    'label' : 'Mora',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '60',
    'label' : 'Mandarina',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '61',
    'label' : 'Naranja',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '62',
    'label' : 'Níspero',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '63',
    'label' : 'Olivo',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '64',
    'label' : 'Palto',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '65',
    'label' : 'Pecán',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '66',
    'label' : 'Pomelo',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '67',
    'label' : 'Guayabo',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '68',
    'label' : 'Guayaba',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '69',
    'label' : 'Mringa',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '70',
    'label' : 'Mango',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '71',
    'label' : 'Nogal',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '72',
    'label' : 'Almendro',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '73',
    'label' : 'Manzano',
    'latin' : '',
    'tipo' : 'comestible'
  },
  {
    'id' : '74',
    'label' : 'Algarrobo dulce',
    'latin' : 'Prosopis flexuosa',
    'tipo' : 'nativo'
  },
  {
    'id' : '75',
    'label' : 'Algarrobo negro',
    'latin' : 'Prosopis nigra',
    'tipo' : 'nativo'
  }
]
