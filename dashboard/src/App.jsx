import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Droplets, Sun, Radio } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

export default function IoTDashboard() {
  const [readings, setReadings] = useState([]);
  const [lastReadings, setLastReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/readings`);
      if (!response.ok) throw new Error('Falha ao buscar dados');
      
      const data = await response.json();
      setReadings(data);
      
      // Calcular últimas leituras por sensor
      const last = {};
      data.forEach(reading => {
        if (!last[reading.sensorId] || new Date(reading.timestamp) > new Date(last[reading.sensorId].timestamp)) {
          last[reading.sensorId] = reading;
        }
      });
      setLastReadings(last);
      
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getSensorIcon = (sensorId) => {
    if (sensorId.startsWith('T')) return <Activity className="w-6 h-6" />;
    if (sensorId.startsWith('H')) return <Droplets className="w-6 h-6" />;
    if (sensorId.startsWith('L')) return <Sun className="w-6 h-6" />;
    if (sensorId.startsWith('M')) return <Radio className="w-6 h-6" />;
    return <Activity className="w-6 h-6" />;
  };

  const getSensorName = (sensorId) => {
    if (sensorId.startsWith('T')) return 'Temperatura';
    if (sensorId.startsWith('H')) return 'Umidade';
    if (sensorId.startsWith('L')) return 'Luminosidade';
    if (sensorId.startsWith('M')) return 'Movimento';
    return 'Sensor';
  };

  const getSensorUnit = (sensorId) => {
    if (sensorId.startsWith('T')) return '°C';
    if (sensorId.startsWith('H')) return '%';
    if (sensorId.startsWith('L')) return 'lux';
    if (sensorId.startsWith('M')) return '';
    return '';
  };

  const formatValue = (sensorId, value) => {
    if (sensorId.startsWith('M')) {
      return value ? 'Detectado' : 'Não detectado';
    }
    return `${value}${getSensorUnit(sensorId)}`;
  };

  const prepareChartData = (sensorId) => {
    return readings
      .filter(r => r.sensorId === sensorId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-20)
      .map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        value: r.value
      }));
  };

  if (loading && readings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Erro ao conectar</h3>
          <p className="text-red-600 text-sm">
            Não foi possível conectar à API. Verifique se o servidor está rodando em http://localhost:8080
          </p>
          <button 
            onClick={fetchData}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard IoT</h1>
          <p className="text-gray-600">Monitoramento em tempo real dos sensores</p>
        </div>

        {/* Cards de Última Leitura */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.values(lastReadings).map(reading => (
            <div key={reading.sensorId} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-blue-600">
                  {getSensorIcon(reading.sensorId)}
                </div>
                <span className="text-xs text-gray-500">{reading.sensorId}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                {getSensorName(reading.sensorId)}
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(reading.sensorId, reading.value)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(reading.timestamp).toLocaleString('pt-BR')}
              </p>
            </div>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {Object.keys(lastReadings).map(sensorId => {
            const chartData = prepareChartData(sensorId);
            if (chartData.length === 0 || sensorId.startsWith('M')) return null;

            return (
              <div key={sensorId} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {getSensorName(sensorId)} - {sensorId}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name={getSensorUnit(sensorId)}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>

        {/* Tabela de Leituras */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Histórico de Leituras</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sensor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {readings.slice(0, 50).map((reading, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {reading.sensorId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getSensorName(reading.sensorId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatValue(reading.sensorId, reading.value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(reading.timestamp).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}