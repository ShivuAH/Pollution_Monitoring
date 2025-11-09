// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
    getDatabase, ref, onValue, query, limitToLast
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

import { firebaseConfig, THRESHOLDS, MAP_CONFIG, CHART_CONFIG } from "./config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Global variables
let map, heatmap, chart;
let selectedVehicle = null;
let heatmapVisible = true;

/* ---------------- INIT ---------------- */
document.addEventListener("DOMContentLoaded", () => {
    initializeMap();
    initializeChart();
    setupListeners();

    // ✅ Button Actions Restored
    document.getElementById("refreshBtn").addEventListener("click", refreshData);
    document.getElementById("downloadCSV").addEventListener("click", downloadCSV);
    document.getElementById("toggleHeatmap").addEventListener("click", toggleHeatmap);
});

/* ---------------- MAP ---------------- */
function initializeMap() {
    map = new google.maps.Map(document.getElementById("map"), MAP_CONFIG);

    heatmap = new google.maps.visualization.HeatmapLayer({
        data: [],
        map: map,
        radius: 35
    });
}

/* ---------------- CHART ---------------- */
function initializeChart() {
    const ctx = document.getElementById("co2Chart").getContext("2d");
    chart = new Chart(ctx, {
        ...CHART_CONFIG,
        data: {
            labels: [],
            datasets: [{
                label: "CO₂ Level",
                data: [],
                borderColor: "#006eff",
                borderWidth: 3,
                tension: 0.3
            }]
        }
    });
}

/* ---------------- LISTENERS ---------------- */
function setupListeners() {
    const vehiclesRef = ref(database, "vehicles");
    const alertsRef = query(ref(database, "alerts"), limitToLast(20));

    /* ✅ VEHICLES real-time listener */
    onValue(vehiclesRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        updateVehicleList(data);
        updateSummary(data);
        updateHeatmap(data);

        // ✅ Auto-select a vehicle
        if (!selectedVehicle) {
            selectedVehicle = Object.keys(data)[0];
        }

        if (data[selectedVehicle]) {
            updateVehicleInfo(data[selectedVehicle], selectedVehicle);
            centerMap(data[selectedVehicle]);
        }
    });

    /* ✅ ALERTS listener */
    onValue(alertsRef, (snapshot) => {
        const alerts = snapshot.val();
        if (!alerts) return;

        updateAlerts(alerts);
        document.getElementById("alertCount").textContent = Object.keys(alerts).length;
    });
}

/* ---------------- VEHICLE LIST ---------------- */
function updateVehicleList(vehicles) {
    const list = document.getElementById("vehicleList");
    list.innerHTML = "";

    Object.keys(vehicles).forEach(id => {
        const li = document.createElement("li");
        li.textContent = id;

        if (id === selectedVehicle) li.classList.add("active");

        li.onclick = () => {
            selectedVehicle = id;
            updateVehicleList(vehicles);
            updateVehicleInfo(vehicles[id], id);
            centerMap(vehicles[id]);
        };

        list.appendChild(li);
    });
}

/* ---------------- CENTER MAP ---------------- */
function centerMap(v) {
    if (!v.latitude || !v.longitude) return;
    map.setCenter({ lat: v.latitude, lng: v.longitude });
}

/* ---------------- VEHICLE INFO + CHART ---------------- */
function updateVehicleInfo(v, id) {
    document.getElementById("vehicleNumber").textContent = id;
    document.getElementById("co2Level").textContent = v.co2_ppm;
    document.getElementById("emissionPerKm").textContent = v.emission_per_km;
    document.getElementById("totalEmission").textContent = v.total_emission;

    const status = getStatus(v.co2_ppm);
    const s = document.getElementById("vehicleStatus");
    s.textContent = status;
    s.className = "status-" + status.toLowerCase();

    updateChart(v.co2_ppm);
}

/* ---------------- SUMMARY ---------------- */
function updateSummary(vehicles) {
    const ids = Object.keys(vehicles);
    document.getElementById("vehicleCount").textContent = ids.length;

    let total = 0;
    ids.forEach(id => total += vehicles[id].co2_ppm);
    document.getElementById("avgEmission").textContent =
        (total / ids.length).toFixed(1) + " ppm";
}

/* ---------------- CHART UPDATE ---------------- */
function updateChart(value) {
    if (isNaN(value) || value <= 0) return;

    const now = new Date().toLocaleTimeString();

    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(value);

    if (chart.data.labels.length > 12) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update();
}

/* ---------------- HEATMAP ---------------- */
function updateHeatmap(vehicles) {
    const points = [];

    Object.values(vehicles).forEach(v => {
        if (!v.latitude || !v.longitude) return;
        points.push({
            location: new google.maps.LatLng(v.latitude, v.longitude),
            weight: v.co2_ppm / 100
        });
    });

    heatmap.setData(points);
}

/* ---------------- ALERTS ---------------- */
function updateAlerts(alerts) {
    const body = document.getElementById("alertsBody");
    body.innerHTML = "";

    Object.values(alerts).reverse().forEach(a => {
        const status = getStatus(a.co2);

        const row = `
            <tr>
                <td>${a.vehicle}</td>
                <td>${a.co2}</td>
                <td>${new Date(a.time).toLocaleString()}</td>
                <td>${a.location}</td>
                <td class="status-${status.toLowerCase()}">${status}</td>
            </tr>
        `;

        body.innerHTML += row;
    });
}

/* ---------------- BUTTON FUNCTIONS ---------------- */

function refreshData() {
    console.log("✅ Manual refresh triggered");
    setupListeners();
}

function toggleHeatmap() {
    heatmapVisible = !heatmapVisible;
    heatmap.setMap(heatmapVisible ? map : null);
    console.log("✅ Heatmap toggled:", heatmapVisible);
}

function downloadCSV() {
    const vehiclesRef = ref(database, "vehicles");

    onValue(vehiclesRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        let csv = "Vehicle ID,CO2 PPM,Emission/km,Total Emission,Latitude,Longitude,Timestamp\n";

        Object.keys(data).forEach(id => {
            let v = data[id];
            csv += `${id},${v.co2_ppm},${v.emission_per_km},${v.total_emission},${v.latitude},${v.longitude},${v.timestamp}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "pollution_data.csv";
        a.click();
    }, { onlyOnce: true });
}

/* ---------------- HELPERS ---------------- */
function getStatus(ppm) {
    if (ppm <= THRESHOLDS.NORMAL) return "Normal";
    if (ppm <= THRESHOLDS.MODERATE) return "Moderate";
    return "High";
}
