const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Criar/conectar ao banco de dados SQLite
const db = new sqlite3.Database('./iot_sensors.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite');
    initDatabase();
  }
});

// Inicializar tabela
function initDatabase() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensorId TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('Erro ao criar tabela:', err.message);
    } else {
      console.log('Tabela sensor_readings pronta');
    }
  });
}

// Endpoint para receber dados dos sensores
app.post('/api/sensor/data', (req, res) => {
  const { sensorId, type, value, timestamp } = req.body;

  // Validação básica
  if (!sensorId || value === undefined || !timestamp) {
    return res.status(400).json({ 
      error: 'Dados inválidos. sensorId, value e timestamp são obrigatórios.' 
    });
  }

  const insertSQL = `
    INSERT INTO sensor_readings (sensorId, value, timestamp)
    VALUES (?, ?, ?)
  `;

  db.run(insertSQL, [sensorId, value, timestamp], function(err) {
    if (err) {
      console.error('Erro ao inserir dados:', err.message);
      return res.status(500).json({ error: 'Erro ao salvar dados' });
    }

    console.log(`Leitura recebida: ${sensorId} = ${value} (${timestamp})`);
    res.status(201).json({ 
      success: true, 
      id: this.lastID,
      message: 'Dados salvos com sucesso'
    });
  });
});

// Endpoint para buscar todas as leituras
app.get('/api/sensor/readings', (req, res) => {
  const { sensorId, limit = 100 } = req.query;

  let sql = 'SELECT * FROM sensor_readings';
  let params = [];

  if (sensorId) {
    sql += ' WHERE sensorId = ?';
    params.push(sensorId);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro ao buscar dados:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar dados' });
    }
    res.json(rows);
  });
});

// Endpoint para buscar última leitura de cada sensor
app.get('/api/sensor/latest', (req, res) => {
  const sql = `
    SELECT sensorId, value, timestamp, MAX(timestamp) as latest
    FROM sensor_readings
    GROUP BY sensorId
    ORDER BY sensorId
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar últimas leituras:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar dados' });
    }
    res.json(rows);
  });
});

// Endpoint para estatísticas
app.get('/api/sensor/stats/:sensorId', (req, res) => {
  const { sensorId } = req.params;

  const sql = `
    SELECT 
      COUNT(*) as count,
      AVG(value) as average,
      MIN(value) as min,
      MAX(value) as max
    FROM sensor_readings
    WHERE sensorId = ?
  `;

  db.get(sql, [sensorId], (err, row) => {
    if (err) {
      console.error('Erro ao buscar estatísticas:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
    res.json(row);
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor IoT rodando em http://localhost:${PORT}`);
  console.log(`📊 API pronta para receber dados em http://localhost:${PORT}/api/sensor/data\n`);
});

// Fechar banco de dados ao encerrar
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Erro ao fechar banco de dados:', err.message);
    }
    console.log('\n Banco de dados fechado');
    process.exit(0);
  });
});