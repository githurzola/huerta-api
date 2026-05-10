const USERS = { admin: 'huerta2026', operador: 'zona123' };
let currentRange = 8;
let allMeasurements = [];
let tempChart, humChart, condChart;
let currentMonthlyZone = 'ambas';

/* ── THEME ── */

const MOON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

(function initTheme() {
  const saved = localStorage.getItem('hg-theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

function updateThemeBtn() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const btn = document.getElementById('theme-btn');
  if (btn) btn.innerHTML = isDark ? SUN_SVG : MOON_SVG;
}

window.toggleTheme = function () {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('hg-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('hg-theme', 'dark');
  }
  updateThemeBtn();
  updateChartTheme();
};

document.addEventListener('DOMContentLoaded', updateThemeBtn);

/* ── AUTH ── */

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

/* ── CHART SWITCHING & RANGE ── */

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

/* ── EXPORT CSV ── */

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
  downloadBlob('﻿' + csv, 'text/csv', `huerta-garzones-${new Date().toISOString().slice(0, 10)}.csv`);
};

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type: type + ';charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* ── FILTER ── */

function getFiltered() {
  const cutoff = Date.now() - currentRange * 60 * 60 * 1000;
  return allMeasurements
    .filter(m => new Date(m.date).getTime() >= cutoff)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/* ── CHARTS ── */

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    tick: isDark ? '#6e7681' : '#8a94a6',
    tooltipBg: isDark ? '#1c2128' : '#0f1923',
  };
}

function updateChartTheme() {
  const c = getChartColors();
  [tempChart, humChart, condChart].forEach(chart => {
    if (!chart) return;
    chart.options.scales.x.ticks.color = c.tick;
    chart.options.scales.y.ticks.color = c.tick;
    chart.options.scales.x.grid.color = c.grid;
    chart.options.scales.y.grid.color = c.grid;
    chart.options.plugins.tooltip.backgroundColor = c.tooltipBg;
    chart.update();
  });
}

function initCharts() {
  const c = getChartColors();
  const cfg = () => ({
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.tooltipBg,
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.7)',
          padding: 10,
          cornerRadius: 8,
        }
      },
      scales: {
        x: {
          ticks: { color: c.tick, font: { family: 'IBM Plex Mono', size: 10 }, maxTicksLimit: 10 },
          grid: { color: c.grid }
        },
        y: {
          ticks: { color: c.tick, font: { family: 'IBM Plex Mono', size: 10 } },
          grid: { color: c.grid }
        }
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

/* ── MONTHLY REPORT ── */

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function generateMonthlyData() {
  const byMonth = {};
  allMeasurements.forEach(m => {
    if (!m.date) return;
    const d = new Date(m.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { 'Zona C': [], 'Zona D': [] };
    const zone = m.zone || 'Zona C';
    if (!byMonth[key][zone]) byMonth[key][zone] = [];
    byMonth[key][zone].push(m);
  });
  return byMonth;
}

function calcStats(arr, key) {
  const vals = arr.map(m => parseFloat(m[key])).filter(v => !isNaN(v) && v > 0);
  if (!vals.length) return { avg: null, min: null, max: null };
  return {
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
  };
}

function fmtStat(v, dec) {
  return v != null ? v.toFixed(dec) : '--';
}

window.setMonthlyZone = function (zone, btn) {
  currentMonthlyZone = zone;
  document.querySelectorAll('.monthly-zone-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMonthlyTable();
};

function renderMonthlyTable() {
  const data = generateMonthlyData();
  const months = Object.keys(data).sort().reverse();
  const tbody = document.getElementById('monthly-tbody');
  const countEl = document.getElementById('monthly-count');

  if (!months.length) {
    tbody.innerHTML = '<tr><td colspan="12" class="monthly-empty">Sin datos disponibles</td></tr>';
    countEl.textContent = '0 meses';
    return;
  }

  const zones = currentMonthlyZone === 'ambas' ? ['Zona C', 'Zona D'] : [currentMonthlyZone];

  const rows = [];
  months.forEach(key => {
    const [year, month] = key.split('-');
    const monthLabel = `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
    zones.forEach(zone => {
      const arr = data[key][zone] || [];
      const temp = calcStats(arr, 'temp');
      const hum = calcStats(arr, 'moisture');
      const cond = calcStats(arr, 'conductivity');
      rows.push(`<tr>
        <td>${monthLabel}</td>
        <td>${zone}</td>
        <td>${fmtStat(temp.avg, 1)} °C</td>
        <td>${fmtStat(temp.min, 1)} °C</td>
        <td>${fmtStat(temp.max, 1)} °C</td>
        <td>${fmtStat(hum.avg, 1)} %</td>
        <td>${fmtStat(hum.min, 1)} %</td>
        <td>${fmtStat(hum.max, 1)} %</td>
        <td>${fmtStat(cond.avg, 0)} µS</td>
        <td>${fmtStat(cond.min, 0)} µS</td>
        <td>${fmtStat(cond.max, 0)} µS</td>
        <td>${arr.length}</td>
      </tr>`);
    });
  });

  tbody.innerHTML = rows.join('');
  countEl.textContent = `${months.length} ${months.length === 1 ? 'mes' : 'meses'} registrados`;
}

window.exportMonthlyCSV = function () {
  const data = generateMonthlyData();
  const months = Object.keys(data).sort();
  const zones = ['Zona C', 'Zona D'];

  const header = ['Mes', 'Zona',
    'Temp. prom. (°C)', 'Temp. min. (°C)', 'Temp. max. (°C)',
    'Humedad prom. (%)', 'Humedad min. (%)', 'Humedad max. (%)',
    'Conductividad prom. (µS)', 'Conductividad min. (µS)', 'Conductividad max. (µS)',
    'Total mediciones', 'Resumen'
  ];

  const rows = [header];

  months.forEach(key => {
    const [year, month] = key.split('-');
    const monthLabel = `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
    zones.forEach(zone => {
      const arr = data[key][zone] || [];
      const temp = calcStats(arr, 'temp');
      const hum = calcStats(arr, 'moisture');
      const cond = calcStats(arr, 'conductivity');
      const f = (v, d) => v != null ? v.toFixed(d) : '';

      let resumen = '';
      if (arr.length > 0) {
        const parts = [];
        if (temp.avg != null) parts.push(`Temp: prom ${f(temp.avg,1)}°C (min ${f(temp.min,1)} / max ${f(temp.max,1)})`);
        if (hum.avg != null) parts.push(`Humedad: prom ${f(hum.avg,1)}% (min ${f(hum.min,1)} / max ${f(hum.max,1)})`);
        if (cond.avg != null) parts.push(`Conductividad: prom ${f(cond.avg,0)} µS (min ${f(cond.min,0)} / max ${f(cond.max,0)})`);
        resumen = parts.join('. ');
      } else {
        resumen = 'Sin datos';
      }

      rows.push([
        monthLabel, zone,
        f(temp.avg, 1), f(temp.min, 1), f(temp.max, 1),
        f(hum.avg, 1), f(hum.min, 1), f(hum.max, 1),
        f(cond.avg, 0), f(cond.min, 0), f(cond.max, 0),
        arr.length,
        resumen
      ]);
    });
  });

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadBlob('﻿' + csv, 'text/csv', `huerta-garzones-registro-mensual-${new Date().toISOString().slice(0, 10)}.csv`);
};
