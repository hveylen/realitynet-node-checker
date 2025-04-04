// --- TESTING SCRIPT V3 ---
// Tries to fetch location for 8.8.8.8 VIA THE PROXY, WITHOUT specifying fields.
document.addEventListener('DOMContentLoaded', () => {

    const mapStatusDiv = document.getElementById('mapStatus');
    const map = L.map('map').setView([20, 0], 2); // Initialize map minimally

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    mapStatusDiv.textContent = 'Running simple geolocation test VIA PROXY (no fields specified)...';
    console.log('TEST V3: Attempting to fetch location for 8.8.8.8 via proxy (no fields)...');

    // --- URLs ---
    const testIp = '8.8.8.8';
    // Target URL WITHOUT the ?fields parameter
    const targetGeoUrl = `https://ip-api.com/json/${testIp}`;
    // Proxy URL using the simplified target URL
    const proxyGeoUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetGeoUrl)}`;

    async function runTestViaProxyNoFields() {
        try {
            // Try fetching via the allorigins.win proxy
            const response = await fetch(proxyGeoUrl); // Using the proxy URL

            console.log('TEST V3: Proxy fetch response received. Status:', response.status);

            if (!response.ok) {
                console.error('TEST V3: Proxy fetch failed with status:', response.status, response.statusText);
                throw new Error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
            }

            // allorigins wraps the actual response in 'contents'
            const proxyData = await response.json();
            console.log('TEST V3: Proxy response data:', proxyData);

            if (!proxyData.contents) {
                 throw new Error("Proxy response did not contain 'contents' field.");
            }

            // Parse the actual geolocation data from the 'contents' string
            const data = JSON.parse(proxyData.contents);
            console.log('TEST V3: Geolocation data received via proxy (no fields):', data);

            // Check for success status and presence of lat/lon (ip-api includes them by default)
            if (data.status === 'success' && data.lat !== undefined && data.lon !== undefined) {
                // Use data.query if available, otherwise the testIp
                const locatedIp = data.query || testIp;
                mapStatusDiv.textContent = `TEST V3 SUCCESSFUL! Received location for ${locatedIp} via proxy: Lat ${data.lat}, Lon ${data.lon}, City: ${data.city || 'N/A'}`;
                // Plot a single marker for success
                L.marker([data.lat, data.lon])
                 .addTo(map)
                 .bindPopup(`Successfully located ${locatedIp} via proxy.<br>City: ${data.city || 'N/A'}`)
                 .openPopup();
                map.setView([data.lat, data.lon], 5);
            } else {
                // Use data.query if available, otherwise the testIp
                const failedIp = data.query || testIp;
                mapStatusDiv.textContent = `TEST V3 FAILED: API (via proxy) returned status '${data.status || 'unknown'}' for ${failedIp}. Check console.`;
            }

        } catch (error) {
            console.error('TEST V3: An error occurred during the proxy fetch test:', error);
            mapStatusDiv.textContent = `TEST V3 FAILED: Error during proxy fetch: ${error.message}. Check console.`;
        }
    }

    runTestViaProxyNoFields();

}); // End DOMContentLoaded
