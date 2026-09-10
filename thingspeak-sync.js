require('dotenv').config();
const cron = require('node-cron');
const admin = require('firebase-admin');

const CHANNEL_ID = process.env.THINGSPEAK_CHANNEL_ID;
const READ_API_KEY = process.env.THINGSPEAK_READ_API_KEY;

const db = admin.database();

async function obtenerUltimaLecturaThingSpeak() {
  const url = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds/last.json?api_key=${READ_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ThingSpeak respondió ${res.status}`);
  return res.json();
}

async function guardarMonitoreoCuarto() {
  try {
    const data = await obtenerUltimaLecturaThingSpeak();

    // field1 = temperatura ambiente del cuarto (°C)
    // field2 = humedad ambiente del cuarto (%)
    // field3 = sensor infrarrojo de presencia (1 = detectado, 0 = sin detección)
    const temperatura = data.field1;
    const humedad = data.field2;
    const presencia = data.field3;

    if (temperatura === null && humedad === null && presencia === null) {
      console.log('[thingspeak] La última lectura no trae ningún valor.');
      return;
    }

    await db.ref('MonitoreoCuarto').set({
      temperatura: temperatura !== null ? parseFloat(temperatura) : null,
      humedad: humedad !== null ? parseFloat(humedad) : null,
      presencia: presencia !== null ? parseInt(presencia) : null,
      fecha: data.created_at,
      recibido: new Date().toISOString(),
    });

    console.log(`[thingspeak] Cuarto -> Temp: ${temperatura}°C | Humedad: ${humedad}% | Presencia: ${presencia}`);
  } catch (error) {
    console.error('[thingspeak] Error al consultar/guardar:', error.message);
  }
}

function iniciarSincronizacionThingSpeak() {
  // Consulta cada 10 minutos
  cron.schedule('*/10 * * * *', guardarMonitoreoCuarto);
  console.log('[thingspeak] Sincronización del cuarto programada cada 10 minutos.');
  // Ejecutar una vez al iniciar, para no esperar 10 minutos la primera vez
  guardarMonitoreoCuarto();
}

module.exports = { iniciarSincronizacionThingSpeak, guardarMonitoreoCuarto };
