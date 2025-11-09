// Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyCXhUAp63QorrqYHVPhAC6SjyYONmYbQk8",
    authDomain: "pollutionmonitoring-41560.firebaseapp.com",
    databaseURL: "https://pollutionmonitoring-41560-default-rtdb.firebaseio.com",
    projectId: "pollutionmonitoring-41560",
    storageBucket: "pollutionmonitoring-41560.firebasestorage.app",
    messagingSenderId: "415213477037",
    appId: "1:415213477037:web:2d323bdcb3f8d062dd7a24",
    measurementId: "G-L5HW40ZEMB"
};

// Constants for CO2 thresholds
export const THRESHOLDS = {
    NORMAL: 1000,  // PPM
    MODERATE: 2000 // PPM
};

// Google Maps configuration
export const MAP_CONFIG = {
    center: { lat: 12.9716, lng: 77.5946 }, // Bangalore coordinates
    zoom: 12,
    mapTypeId: 'roadmap'
};

// Chart.js configuration
export const CHART_CONFIG = {
    type: 'line',
    options: {
        animation: false,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'CO₂ (PPM)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Time'
                }
            }
        },
        plugins: {
            legend: {
                display: false
            }
        }
    }
};