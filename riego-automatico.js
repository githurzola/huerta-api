require('dotenv').config();
const cron = require('node-cron');
const services = require('./services');
const { enviarTelegram } = require('./notificaciones-telegram');

const TTN_API_URL =
  "https://nam1.cloud.thethings.network/api/v3/as/applications/proyecto-huerta/devices/la66-prueba/down/replace";

const TTN_API_KEY = process.env.API_KEY_TTN;

const ZONAS_RIEGO = [
  { nombre: 'Apertura valvula 1 (payload 01)', payload: 'AQ==' },
  { nombre: 'Apertura valvula 2 (payload 02)', payload: 'Ag==' },
  { nombre: 'Inicio programa PLC (payload 03)',  payload: 'Aw==' },
  { nombre: 'Apertura valvula 4 (payload 04)', payload: 'BA==' },
  { nombre: 'Apertura valvula 5 (payload 05)', payload: 'BQ==' },
];

// Riego fijo: payload 03 (inicio del programa del PLC) a las 5:00 a.m. y 5:00 p.m.
const ZONA_RIEGO_FIJO = 'Inicio programa PLC (payload 03)';
const HORARIOS_RIEGO_FIJO = ['0 5 * * *', '0 17 * * *'];
const TIMEZONE = 'America/Bogota';

async function enviarComandoRiego(nombreZona) {
  const zona = ZONAS_RIEGO.find(z => z.nombre === nombreZona);
  if (!zona) throw new Error(`Zona no encontrada en ZONAS_RIEGO: ${nombreZona}`);

  const res = await fetch(TTN_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TTN_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'my-app/v1',
    },
    body: JSON.stringify({
      downlinks: [
        {
          f_port: 15,
          frm_payload: zona.payload,
          priority: 'NORMAL',
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`TTN respondio ${res.status}`);
  console.log(`[riego-automatico] Comando enviado para: ${zona.nombre}`);
}

function horaColombia(d) {
  return d.toLocaleString('es-CO', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// enviarTelegram usa parse_mode HTML
function escaparHtml(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function ejecutarRiegoFijo() {
  const inicio = new Date();
  const hora = horaColombia(inicio);

  let config;
  try {
    config = await services.getConfigRiego();
  } catch (error) {
    console.error('[riego-automatico] Error leyendo Config/riegoAutomatico:', error.message);
    await enviarTelegram(`<b>Riego fijo</b>\nHora: ${hora}\nERROR: no se pudo leer la configuracion (${escaparHtml(error.message)}). No se envio el riego.`);
    return;
  }

  if (config?.activo !== true || config?.modo !== 'fijo') {
    console.log(`[riego-automatico] Riego fijo omitido (${hora}): activo=${config?.activo}, modo=${config?.modo}`);
    return;
  }

  const registro = {
    zone: ZONA_RIEGO_FIJO,
    modo: 'fijo',
    start_time: inicio.toISOString(),
    end_time: inicio.toISOString(),
  };

  try {
    await enviarComandoRiego(ZONA_RIEGO_FIJO);
    await services.createIrrigation({ ...registro, resultado: 'ok' });
    await enviarTelegram(`<b>Riego fijo</b>\nHora: ${hora}\nResultado: comando enviado a TTN (payload 03).`);
    console.log(`[riego-automatico] Riego fijo enviado (${hora}).`);
  } catch (error) {
    console.error('[riego-automatico] Error en riego fijo:', error.message);
    try {
      await services.createIrrigation({ ...registro, resultado: 'error', error: error.message });
    } catch (e) {
      console.error('[riego-automatico] Error registrando el riego fallido:', e.message);
    }
    await enviarTelegram(`<b>Riego fijo</b>\nHora: ${hora}\nERROR: ${escaparHtml(error.message)}`);
  }
}

function iniciarRiegoAutomatico() {
  HORARIOS_RIEGO_FIJO.forEach(expr => {
    cron.schedule(expr, ejecutarRiegoFijo, { timezone: TIMEZONE });
  });
  console.log('[riego-automatico] Riego fijo programado a las 5:00 am y 5:00 pm (America/Bogota).');
}

module.exports = { ZONAS_RIEGO, enviarComandoRiego, ejecutarRiegoFijo, iniciarRiegoAutomatico };
