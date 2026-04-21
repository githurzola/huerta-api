require('dotenv').config();
const services = require("./services");
const { parseUplinkRequest } = require("./parser");

const TTN_API_URL =
  "https://nam1.cloud.thethings.network/api/v3/as/applications/proyecto-huerta/devices/la66-prueba/down/replace";
const TTN_API_KEY =
  process.env.API_KEY_TTN ||
  "NNSXS.6EIBLPA7BJAS6QCIUQSYPVZHBD6ADD7SCGMMRJA.34AMWYZNHEDTVQJPV6UJSTP7EW5SW4ZKWOTYRTK2NIDDL4R2BHYA";

const uplink = async (request, response) => {
  try {
    const parsed = parseUplinkRequest(request);
    const sensorName = parsed.sensorName;
    if (!sensorName) {
      return response
        .status(400)
        .json({ status: "Error", message: "Sensor name not found" });
    }
    if (!sensorName.includes("sensor")) {
      return response
        .status(200)
        .json({ status: "No sensor", message: "Device is a LA-66" });
    }

    const zone = await services.getZoneBySensorName(sensorName);
    if (!zone) {
      return response
        .status(404)
        .json({ status: "Error", message: "Zone not found for sensor" });
    }

    const normalized = parsed.normalizedPayload;
    if (!normalized) {
      return response
        .status(400)
        .json({ status: "Error", message: "Normalized payload not found" });
    }

    const measurement = {
      zone: zone.nombre,
      sensor: sensorName,
      temp: normalized.temp_SOIL ?? null,
      moisture: normalized.water_SOIL ?? null,
      conductivity: normalized.conduct_SOIL,
      date: parsed.date,
    };

    await services.createMeasurement(measurement);

    const dateObj = new Date(parsed.date);
    const utcHour = dateObj.getUTCHours();
    const colombiaHour = (utcHour + 19) % 24;
    console.log('La hora en Colombia es:', colombiaHour);

    if (colombiaHour >= 11 && colombiaHour < 14) {
      const zonasOrden = ["Zona A", "Zona B", "Zona C", "Zona D", "Zona E"];

      const lastIrrigation = await services.getLastIrrigation();
      let nextZone = zonasOrden[0];
      let lastIrrigationEnd = null;

      if (lastIrrigation && lastIrrigation.zone) {
        const lastIndex = zonasOrden.indexOf(lastIrrigation.zone);
        nextZone = zonasOrden[(lastIndex + 1) % zonasOrden.length];
        if (lastIrrigation.end_time) {
          lastIrrigationEnd = new Date(lastIrrigation.end_time);
        }
      }

      if (zone.nombre === nextZone) {
        const now = new Date();
        if (!lastIrrigationEnd || now > lastIrrigationEnd) {
          const end = new Date(now.getTime() + 10 * 60 * 1000);

          await services.createIrrigation({
            zone: zone.nombre,
            start_time: now.toISOString(),
            end_time: end.toISOString(),
          });

          const zonaBinario = {
            "Zona A": "AQ==",
            "Zona B": "Ag==",
            "Zona C": "Aw==",
            "Zona D": "BA==",
            "Zona E": "BQ==",
            "Prueba": "Bg==",
          };

          const frm_payload = zonaBinario[zone.nombre] || "BA==";

          await fetch(TTN_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${TTN_API_KEY}`,
              "Content-Type": "application/json",
              "User-Agent": "my-app/v1",
            },
            body: JSON.stringify({
              downlinks: [
                {
                  f_port: 15,
                  frm_payload,
                  priority: "NORMAL",
                },
              ],
            }),
          });

          console.log(`Irrigación creada para ${zone.nombre}`);
        } else {
          console.log("No se crea irrigación: aún dentro del tiempo de la última irrigación");
        }
      } else {
        console.log(`No se crea irrigación: zona actual (${zone.nombre}) no es la siguiente (${nextZone})`);
      }
    }

    return response
      .status(200)
      .json({ status: "Success", message: "Measurement saved", measurement });
  } catch (error) {
    console.error(error);
    return response
      .status(500)
      .json({ status: "Error", message: "Internal server error" });
  }
};

module.exports = {
  uplink,
};