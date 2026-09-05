const express = require("express");
const bodyParser = require("body-parser");
var cors = require('cors')
const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(cors())

const controller = require("./controller");
const utils = require("./utils");
const notificaciones = require("./notificaciones-telegram");

app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'Success', message: 'Pong' });
});

app.get('/probar-telegram', async (req, res) => {
  try {
    await notificaciones.enviarResumenDiario();
    res.status(200).json({ status: 'Success', message: 'Notificación enviada, revisa tu Telegram' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'Error', message: error.message });
  }
});

app.post("/uplink", controller.uplink)

app.get("/register-hardcoded", async (req, res) => {
  try {
    await utils.registrarTodo();
    res.status(200).json({ status: "Success", message: "Zonas y sensores registrados." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "Error", message: "No se pudo registrar la información." });
  }
});

notificaciones.iniciarNotificacionesDiarias();


app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});