const parseUplinkRequest = (request) => {
  const token = request.headers['token'] || null;
  const payload = request.body;

  const sensorName = payload?.end_device_ids?.device_id || null;
  const decoded = payload?.uplink_message?.decoded_payload || null;
  const date = payload?.received_at || payload?.uplink_message?.received_at || null;
  const battery = decoded?.Bat || null;
  const temp_air = decoded?.TempC_DS18B20 ?? null;
  const temp_soil = decoded?.temp_SOIL ?? null;
  const moisture = decoded?.water_SOIL ?? null;
  const conductivity = decoded?.conduct_SOIL ?? null;

  return {
    token,
    sensorName,
    battery,
    temp_air,
    temp_soil,
    moisture,
    conductivity,
    date,
    raw: payload,
    normalizedPayload: decoded,
  };
};

module.exports = {
  parseUplinkRequest,
};