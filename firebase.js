import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBg29zZu3r23DzKAAoNPtv2_0AsWMFIDF8",
  authDomain: "huerta-garzones-58b08.firebaseapp.com",
  databaseURL: "https://huerta-garzones-58b08-default-rtdb.firebaseio.com",
  projectId: "huerta-garzones-58b08",
  storageBucket: "huerta-garzones-58b08.firebasestorage.app",
  messagingSenderId: "781800566263",
  appId: "1:781800566263:web:71393f06deba0426a792f2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

window._startDashboard = function () {
  signInAnonymously(auth)
    .then(() => {
      console.log('Autenticado correctamente con Firebase');
      cargarDatos();
    })
    .catch((error) => {
      console.error('Error de autenticación:', error);
    });
};

function cargarDatos() {
  initCharts();
  setInterval(() => {
    document.getElementById('nav-time').textContent = new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' });
    document.getElementById('foot-time').textContent = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  }, 1000);

  onValue(ref(db, 'Measurements'), snap => {
    const val = snap.val();
    if (!val) return;
    allMeasurements = Object.values(val).map(m => ({ ...m, bat: m.bat || '3.3' }));
    updateSensorCards(val);
    updateCharts();
    renderMonthlyTable();
  });
}