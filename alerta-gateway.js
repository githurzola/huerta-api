require('dotenv').config();
const cron = require('node-cron');
const admin = require('firebase-admin');
const { enviarTelegram } = require('./notificaciones-telegram');

const ZONAS_MONITOREAR = ['Zona C', 'Zona D'];
const HORAS_SIN_REPORTE = 3;

const db = admin.database();

// Estado en memoria: true = alerta ya enviada y activa, false = normal
const estadoAlertas = {};
ZONAS_MONITOREAR.forEach(z => { estadoAlertas[z] = false; });

async function verificarZonas() {
  try {
    const snapshot = await db.ref('Measurements').once('value');
    const measurements = snapshot.val();

    if (!measurements) {
      console.log('[alerta-gateway] No hay mediciones en Firebase.');
      return;
    }

    const todas = Object.values(measurements);
    const limiteMs = HORAS_SIN_REPORTE * 60 * 60 * 1000;
    const ahora = Date.now();

    for (const zona of ZONAS_MONITOREAR) {
      const medidasZona = todas.filter(m => m.zone === zona);
      const ultimaTs = medidasZona.length
        ? Math.max(...medidasZona.map(m => new Date(m.date).getTime()))
        : null;

      const sinReportar = !ultimaTs || (ahora - ultimaTs) > limiteMs;

      if (sinReportar && !estadoAlertas[zona]) {
        estadoAlertas[zona] = true;
        const horas = ultimaTs ? Math.round((ahora - ultimaTs) / (60 * 60 * 1000)) : null;
        const detalle = horas !== null ? `${horas}h sin datos` : 'tiempo desconocido sin datos';
        const msg = `ALERTA: ${zona} lleva ${detalle}. Revisa el gateway y los sensores.`;
        await enviarTelegram(msg);
        console.log(`[alerta-gateway] Alerta enviada para ${zona}.`);
      } else if (!sinReportar && estadoAlertas[zona]) {
        estadoAlertas[zona] = false;
        const msg = `RECUPERADO: ${zona} ha vuelto a reportar datos correctamente.`;
        await enviarTelegram(msg);
        console.log(`[alerta-gateway] Recuperacion notificada para ${zona}.`);
      }
    }
  } catch (error) {
    console.error('[alerta-gateway] Error al verificar zonas:', error.message);
  }
}

function iniciarAlertaGateway() {
  // Verificar cada 2 horas
  cron.schedule('0 */2 * * *', verificarZonas);
  console.log('[alerta-gateway] Monitoreo de gateway iniciado (cada 2 horas).');
  // Verificar una vez al iniciar
  verificarZonas();
}

module.exports = { iniciarAlertaGateway, verificarZonas };
