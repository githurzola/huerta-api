const services = require('./services');

const zonas = [
  { nombre: 'Zona A', is_enable: true },
  { nombre: 'Zona B', is_enable: true },
  { nombre: 'Zona C', is_enable: true },
  { nombre: 'Zona D', is_enable: true },
];

const sensores = [
  { zone: 'Zona A', name: 'sensor-4-huerta' },
  { zone: 'Zona B', name: 'sensor-5' },
  { zone: 'Zona C', name: 'sensor-1' },
  { zone: 'Zona D', name: 'sensor-2' },
];

const registrarZonas = async () => {
  for (const zona of zonas) {
    await services.createZone(zona);
    console.log(`Zona registrada: ${zona.nombre}`);
  }
};

const registrarSensores = async () => {
  for (const sensor of sensores) {
    await services.createSensor(sensor);
    console.log(`Sensor registrado: ${sensor.name} en ${sensor.zone}`);
  }
};

const registrarTodo = async () => {
  await registrarZonas();
  await registrarSensores();
  console.log('Registro completo.');
};

module.exports = {
  registrarZonas,
  registrarSensores,
  registrarTodo,
};