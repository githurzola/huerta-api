require('dotenv').config();
const admin = require('firebase-admin');

// 🔍 DEBUG (puedes quitarlo después)
console.log("ENV TEST:");
console.log(process.env.FIREBASE_PROJECT_ID);
console.log(process.env.FIREBASE_CLIENT_EMAIL);
console.log(process.env.FIREBASE_PRIVATE_KEY ? "KEY OK" : "NO KEY");

// 🔥 Inicializar Firebase correctamente
if (!admin.apps.length) {
  if (!process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("FIREBASE_PRIVATE_KEY no está definida en el .env");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

// ================= ZONES =================

const createZone = async (zone) => {
  const ref = db.ref('Zones').push();
  await ref.set(zone);
  return ref.key;
};

const getZones = async () => {
  const snapshot = await db.ref('Zones').once('value');
  return snapshot.val();
};

const updateZone = async (zoneId, data) => {
  await db.ref(`Zones/${zoneId}`).update(data);
};

const deleteZone = async (zoneId) => {
  await db.ref(`Zones/${zoneId}`).remove();
};

// ================= SENSORS =================

const createSensor = async (sensor) => {
  const ref = db.ref('Sensors').push();
  await ref.set(sensor);
  return ref.key;
};

const getSensors = async () => {
  const snapshot = await db.ref('Sensors').once('value');
  return snapshot.val();
};

const updateSensor = async (sensorId, data) => {
  await db.ref(`Sensors/${sensorId}`).update(data);
};

const deleteSensor = async (sensorId) => {
  await db.ref(`Sensors/${sensorId}`).remove();
};

// ================= MEASUREMENTS =================

const createMeasurement = async (measurement) => {
  const ref = db.ref('Measurements').push();
  await ref.set(measurement);
  return ref.key;
};

const getMeasurements = async () => {
  const snapshot = await db.ref('Measurements').once('value');
  return snapshot.val();
};

const updateMeasurement = async (measurementId, data) => {
  await db.ref(`Measurements/${measurementId}`).update(data);
};

const deleteMeasurement = async (measurementId) => {
  await db.ref(`Measurements/${measurementId}`).remove();
};

// ================= IRRIGATIONS =================

const createIrrigation = async (irrigation) => {
  const ref = db.ref('Irrigations').push();
  await ref.set(irrigation);
  return ref.key;
};

const getIrrigations = async () => {
  const snapshot = await db.ref('Irrigations').once('value');
  return snapshot.val();
};

const updateIrrigation = async (irrigationId, data) => {
  await db.ref(`Irrigations/${irrigationId}`).update(data);
};

const deleteIrrigation = async (irrigationId) => {
  await db.ref(`Irrigations/${irrigationId}`).remove();
};

const getLastIrrigation = async () => {
  const snapshot = await db.ref('Irrigations').once('value');
  const irrigations = snapshot.val();

  if (!irrigations) return null;

  const sorted = Object.values(irrigations).sort(
    (a, b) => new Date(b.end_time) - new Date(a.end_time)
  );

  return sorted[0] || null;
};

// ================= RELACIONES =================

const getZoneBySensorName = async (sensorName) => {
  const snapshot = await db.ref('Sensors')
    .orderByChild('name')
    .equalTo(sensorName)
    .once('value');

  const sensors = snapshot.val();
  if (!sensors) return null;

  const sensor = Object.values(sensors)[0];
  if (!sensor) return null;

  const zoneName = sensor.zone;

  const zonesSnap = await db.ref('Zones')
    .orderByChild('nombre')
    .equalTo(zoneName)
    .once('value');

  const zones = zonesSnap.val();
  if (!zones) return null;

  return Object.values(zones)[0];
};

module.exports = {
  createZone,
  getZones,
  updateZone,
  deleteZone,
  createSensor,
  getSensors,
  updateSensor,
  deleteSensor,
  createMeasurement,
  getMeasurements,
  updateMeasurement,
  deleteMeasurement,
  createIrrigation,
  getIrrigations,
  updateIrrigation,
  deleteIrrigation,
  getLastIrrigation,
  getZoneBySensorName,
};