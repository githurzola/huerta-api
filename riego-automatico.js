require('dotenv').config();

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

module.exports = { ZONAS_RIEGO, enviarComandoRiego };
