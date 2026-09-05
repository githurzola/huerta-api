require('dotenv').config();
const cron = require('node-cron');
const services = require('./services');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function enviarTelegram(mensaje) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: mensaje,
        parse_mode: 'HTML',
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('[telegram] Error enviando mensaje:', e.message);
    return false;
  }
}

function formatearFecha(d) {
  return new Date(d).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function generarResumenDiario() {
  const measurements = await services.getMeasurements();

  if (!measurements) {
    return '⚠️ <b>Huerta Garzones</b>\n\nNo hay mediciones registradas hoy. Revisa si los sensores están enviando datos.';
  }

  const todas = Object.values(measurements);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const deHoy = todas.filter(m => new Date(m.date) >= hoy);

  const zonas = {};
  deHoy.forEach(m => {
    if (!zonas[m.zone]) zonas[m.zone] = [];
    zonas[m.zone].push(m);
  });

  let mensaje = `🌱 <b>Resumen diario — Huerta Garzones</b>\n`;
  mensaje += `📅 ${new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'long', year: 'numeric' })}\n\n`;

  if (Object.keys(zonas).length === 0) {
    mensaje += '⚠️ No se registraron datos nuevos el día de hoy. Revisa el gateway y los sensores.\n';
  } else {
    for (const [zona, mediciones] of Object.entries(zonas)) {
      const temps = mediciones.map(m => parseFloat(m.temp)).filter(n => !isNaN(n));
      const hums = mediciones.map(m => parseFloat(m.moisture)).filter(n => !isNaN(n));
      const ultima = mediciones.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      const tempProm = temps.length ? (temps.reduce((a, b) => a + b) / temps.length).toFixed(1) : '--';
      const humProm = hums.length ? (hums.reduce((a, b) => a + b) / hums.length).toFixed(1) : '--';
      const humMin = hums.length ? Math.min(...hums).toFixed(1) : '--';

      mensaje += `<b>📍 ${zona}</b>\n`;
      mensaje += `   🌡️ Temp. promedio: ${tempProm}°C\n`;
      mensaje += `   💧 Humedad promedio: ${humProm}% (mín: ${humMin}%)\n`;
      mensaje += `   🕐 Última lectura: ${formatearFecha(ultima.date)}\n`;
      mensaje += `   📊 Mediciones hoy: ${mediciones.length}\n\n`;

      if (hums.length && parseFloat(humMin) < 20) {
        mensaje += `   ⚠️ Humedad baja detectada en esta zona\n\n`;
      }
    }
  }

  // Últimas 2 horas — para saber si algo dejó de reportar
  const hace2h = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const activosReciente = new Set(
    todas.filter(m => new Date(m.date) >= hace2h).map(m => m.zone)
  );
  const ZONAS_ACTIVAS = ['Zona C', 'Zona D']; // ajusta aquí cuando agregues o quites sensores
  const todasLasZonas = new Set(ZONAS_ACTIVAS);
  const sinReportar = [...todasLasZonas].filter(z => !activosReciente.has(z));

  if (sinReportar.length > 0) {
    mensaje += `🔴 <b>Sin datos recientes (más de 2h):</b> ${sinReportar.join(', ')}\n`;
  } else {
    mensaje += `✅ Todos los sensores reportando con normalidad.`;
  }

  return mensaje;
}

async function enviarResumenDiario() {
  console.log('[notificaciones] Generando resumen diario...');
  const mensaje = await generarResumenDiario();
  const ok = await enviarTelegram(mensaje);
  console.log(`[notificaciones] Resumen diario ${ok ? 'enviado' : 'FALLÓ'}.`);
}

function iniciarNotificacionesDiarias() {
  // Todos los días a las 7:00 p.m. hora Colombia
  cron.schedule('0 19 * * *', enviarResumenDiario, { timezone: 'America/Bogota' });
  console.log('[notificaciones] Resumen diario programado para las 7:00 pm (America/Bogota).');
}

module.exports = { iniciarNotificacionesDiarias, enviarResumenDiario, enviarTelegram };
