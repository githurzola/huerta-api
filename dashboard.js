const USERS = { admin: 'huerta2026', operador: 'zona123' };
let currentRange = 8;
let allMeasurements = [];
let tempChart, humChart, condChart;

window.doLogin = function () {
  const u = document.getElementById('inp-user').value.trim();
  const p = document.getElementById('inp-pass').value;
  const err = document.getElementById('login-err');
  if (USERS[u] && USERS[u] === p) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    if (window._startDashboard) window._startDashboard();
  } else {
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 3000);
  }
};

window.doLogout = function () {
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('inp-user').value = '';
  document.getElementById('inp-pass').value = '';
};

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin();
});

window.switchChart = function (which, btn) {
  document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  ['temp', 'hum', 'cond'].forEach(n => {
    document.getElementById(n + 'ChartCard').style.display = n === which ? 'block' : 'none';
  });
  const map = { temp: tempChart, hum: humChart, cond: condChart };
  if (map[which]) map[which].resize();
};

window.setRange = function (h) {
  currentRange = h;
  document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
  const map = { 2: 'btn-2h', 8: 'btn-8h', 24: 'btn-24h', 168: 'btn-7d' };
  document.getElementById(map[h])?.classList.add('active');
  updateCharts();
};

window.exportCSV = function () {
  const filtered = getFiltered();
  const rows = [['Fecha', 'Zona', 'Sensor', 'Temp_suelo_C', 'Humedad_%', 'Conductividad_uS', 'Bateria_V']];
  filtered.forEach(m => {
    rows.push([
      new Date(m.date).toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      m.zone || '', m.sensor || '',
      m.temp || '', m.moisture || '', m.conductivity || '', m.bat || ''
    ]);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `huerta-garzones-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
};

window.exportExcel = function () {
  const filtered = getFiltered();
  const headers = ['Fecha', 'Zona', 'Sensor', 'Temp suelo (°C)', 'Humedad (%)', 'Conductividad (µS)', 'Batería (V)'];
  const rows = filtered.map(m => [
    new Date(m.date).toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
    m.zone || '', m.sensor || '',
    m.temp || '', m.moisture || '', m.conductivity || '', m.bat || ''
  ]);
  let xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Mediciones"><Table>`;
  xml += `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>`;
  rows.forEach(r => {
    xml += `<Row>${r.map((v, i) => `<Cell><Data ss:Type="${i > 2 ? 'Number' : 'String'}">${v}</Data></Cell>`).join('')}</Row>`;
  });
  xml += `</Table></Worksheet></Workbook>`;
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `huerta-garzones-${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
};

function getFiltered() {
  const cutoff = Date.now() - currentRange * 60 * 60 * 1000;
  return allMeasurements
    .filter(m => new Date(m.date).getTime() >= cutoff)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function initCharts() {
  const gridColor = 'rgba(0,0,0,0.05)';
  const tickColor = '#8a94a6';
  const cfg = (colors) => ({
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false }, tooltip: {
          backgroundColor: '#0f1923', titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.7)',
          padding: 10, cornerRadius: 8,
        }
      },
      scales: {
        x: { ticks: { color: tickColor, font: { family: 'IBM Plex Mono', size: 10 }, maxTicksLimit: 12 }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor, font: { family: 'IBM Plex Mono', size: 10 } }, grid: { color: gridColor } }
      }
    }
  });
  tempChart = new Chart(document.getElementById('tempChart'), cfg());
  humChart = new Chart(document.getElementById('humChart'), cfg());
  condChart = new Chart(document.getElementById('condChart'), cfg());
}

function makeDataset(data, color, label) {
  return {
    label, data,
    borderColor: color,
    backgroundColor: color + '18',
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: color,
    borderWidth: 2,
    tension: 0.35,
    spanGaps: true,
    fill: true,
  };
}

function updateCharts() {
  const filtered = getFiltered();
  const zC = filtered.filter(m => m.zone === 'Zona C').sort((a, b) => new Date(a.date) - new Date(b.date));
  const zD = filtered.filter(m => m.zone === 'Zona D').sort((a, b) => new Date(a.date) - new Date(b.date));

  const fmt = d => {
    const dt = new Date(d);
    return dt.toLocaleString('es-CO', { timeZone: 'America/Bogota', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const labels = [...new Set([...zC.map(m => fmt(m.date)), ...zD.map(m => fmt(m.date))])].sort();

  const getVals = (arr, key) => labels.map(l => {
    const f = arr.find(m => fmt(m.date) === l);
    return f ? parseFloat(f[key]) : null;
  });

  tempChart.data.labels = labels;
  tempChart.data.datasets = [
    makeDataset(getVals(zC, 'temp'), '#00875a', 'Zona C'),
    makeDataset(getVals(zD, 'temp'), '#0052cc', 'Zona D'),
  ];
  tempChart.update();

  humChart.data.labels = labels;
  humChart.data.datasets = [
    makeDataset(getVals(zC, 'moisture'), '#0891b2', 'Zona C'),
    makeDataset(getVals(zD, 'moisture'), '#b45309', 'Zona D'),
  ];
  humChart.update();

  condChart.data.labels = labels;
  condChart.data.datasets = [
    makeDataset(getVals(zC, 'conductivity'), '#7c3aed', 'Zona C'),
    makeDataset(getVals(zD, 'conductivity'), '#db2777', 'Zona D'),
  ];
  condChart.update();

  updateTable(filtered);
}

function updateTable(filtered) {
  const recent = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
  const tbody = document.getElementById('table-body');
  document.getElementById('table-count').textContent = `${filtered.length} registros`;
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:2rem">Sin datos en el rango seleccionado</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(m => {
    const dt = new Date(m.date).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `<tr>
      <td>${dt}</td>
      <td>${m.zone || '--'}</td>
      <td>${m.sensor || '--'}</td>
      <td>${m.temp != null ? parseFloat(m.temp).toFixed(1) + ' °C' : '--'}</td>
      <td>${m.moisture != null ? parseFloat(m.moisture).toFixed(1) + ' %' : '--'}</td>
      <td>${m.conductivity != null ? m.conductivity + ' µS' : '--'}</td>
      <td>${m.bat || '--'}</td>
    </tr>`;
  }).join('');
}

function updateSensorCards(measurements) {
  const all = Object.values(measurements);
  const zC = all.filter(m => m.zone === 'Zona C').sort((a, b) => new Date(b.date) - new Date(a.date));
  const zD = all.filter(m => m.zone === 'Zona D').sort((a, b) => new Date(b.date) - new Date(a.date));
  const fmt = d => d ? new Date(d).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--';
  const isRecent = d => d && (Date.now() - new Date(d).getTime()) < 2 * 60 * 60 * 1000;

  [['s1', zC[0]], ['s2', zD[0]]].forEach(([id, last]) => {
    if (!last) return;
    document.getElementById(`${id}-temp`).innerHTML = `${parseFloat(last.temp || 0).toFixed(1)}<span class="s-cell-unit"> °C</span>`;
    document.getElementById(`${id}-hum`).innerHTML = `${parseFloat(last.moisture || 0).toFixed(1)}<span class="s-cell-unit"> %</span>`;
    document.getElementById(`${id}-cond`).innerHTML = `${last.conductivity || '--'}<span class="s-cell-unit"> µS</span>`;
    document.getElementById(`${id}-bat`).innerHTML = `${last.bat || '3.3'}<span class="s-cell-unit"> V</span>`;
    document.getElementById(`${id}-time`).textContent = `Actualizado: ${fmt(last.date)}`;
    const pct = Math.min(100, ((parseFloat(last.bat || 3.3) - 2.8) / (3.6 - 2.8)) * 100);
    document.getElementById(`${id}-batbar`).style.width = pct + '%';
    const badge = document.getElementById(`${id}-badge`);
    badge.textContent = isRecent(last.date) ? 'Activo' : 'Sin señal reciente';
    badge.className = 'badge ' + (isRecent(last.date) ? 'badge-green' : 'badge-gray');
  });

  const temps = [zC[0]?.temp, zD[0]?.temp].filter(Boolean).map(Number);
  const hums = [zC[0]?.moisture, zD[0]?.moisture].filter(Boolean).map(Number);
  const conds = [zC[0]?.conductivity, zD[0]?.conductivity].filter(Boolean).map(Number);
  if (temps.length) document.getElementById('avg-temp').innerHTML = `${(temps.reduce((a, b) => a + b) / temps.length).toFixed(1)}<span class="stat-unit"> °C</span>`;
  if (hums.length) document.getElementById('avg-hum').innerHTML = `${(hums.reduce((a, b) => a + b) / hums.length).toFixed(1)}<span class="stat-unit"> %</span>`;
  if (conds.length) document.getElementById('avg-cond').innerHTML = `${Math.round(conds.reduce((a, b) => a + b) / conds.length)}<span class="stat-unit"> µS</span>`;

  const active = [zC[0], zD[0]].filter(m => m && isRecent(m.date)).length;
  document.getElementById('sensors-active').textContent = active;
  document.getElementById('meas-total').textContent = all.length;

  const lastAll = all.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  if (lastAll) {
    document.getElementById('last-update').textContent = fmt(lastAll.date);
    document.getElementById('last-update-sensor').textContent = lastAll.sensor || lastAll.zone || '--';
  }
}
