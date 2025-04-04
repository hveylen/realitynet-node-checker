// --- TESTING SCRIPT ---
// Tries to fetch location for a single known IP (8.8.8.8) directly.
document.addEventListener('DOMContentLoaded', () => {

    const mapStatusDiv = document.getElementById('mapStatus');
    const map = L.map('map').setView([20, 0], 2); // Initialize map minimally

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    mapStatusDiv.textContent = 'Running simple geolocation test...';
    console.log('TEST: Attempting to fetch location for 8.8.8.8...');

    const testIp = '8.8.8.8';
    const testUrl = `https://ip-api.com/json/${testIp}?fields=lat,lon,query,status`;

    async function runTest() {
        try {
            // Try fetching directly from ip-api.com using standard endpoint
            const response = await fetch(testUrl);

            console.log('TEST: Fetch response received. Status:', response.status);

            if (!response.ok) {
                // Log the status text if the response was not ok (e.g., 403, 404, 500)
                console.error('TEST: Fetch failed with status:', response.status, response.statusText);
                throw new Error(`Workspace failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('TEST: Geolocation data received:', data);

            if (data.status === 'success' && data.lat && data.lon) {
                mapStatusDiv.textContent = `TEST SUCCESSFUL! Received location for ${data.query}: Lat ${data.lat}, Lon ${data.lon}`;
                // Plot a single marker for success
                L.marker([data.lat, data.lon])
                 .addTo(map)
                 .bindPopup(`Successfully located ${data.query}`)
                 .openPopup();
                map.setView([data.lat, data.lon], 5); // Center map on the result
            } else {
                mapStatusDiv.textContent = `TEST FAILED: API returned status '${data.status}' for ${data.query}. Check console.`;
            }

        } catch (error) {
            console.error('TEST: An error occurred during the fetch test:', error);
            mapStatusDiv.textContent = `TEST FAILED: Error during fetch: ${error.message}. Check console.`;
        }
    }

    runTest();

}); // End DOMContentLoaded
