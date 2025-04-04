// --- TESTING SCRIPT V2 ---
// Tries to fetch location for 8.8.8.8 VIA THE PROXY.
document.addEventListener('DOMContentLoaded', () => {

    const mapStatusDiv = document.getElementById('mapStatus');
    const map = L.map('map').setView([20, 0], 2); // Initialize map minimally

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    mapStatusDiv.textContent = 'Running simple geolocation test VIA PROXY...';
    console.log('TEST V2: Attempting to fetch location for 8.8.8.8 via proxy...');

    // --- URLs ---
    const testIp = '8.8.8.8';
    // Target URL for the simple geolocation request
    const targetGeoUrl = `https://ip-api.com/json/${testIp}?fields=lat,lon,query,status`;
    // Proxy URL for the simple geolocation request
    const proxyGeoUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetGeoUrl)}`;

    async function runTestViaProxy() {
        try {
            // Try fetching via the allorigins.win proxy
            const response = await fetch(proxyGeoUrl); // Using the proxy URL now

            console.log('TEST V2: Proxy fetch response received. Status:', response.status);

            if (!response.ok) {
                console.error('TEST V2: Proxy fetch failed with status:', response.status, response.statusText);
                throw new Error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
            }

            // allorigins wraps the actual response in 'contents'
            const proxyData = await response.json();
            console.log('TEST V2: Proxy response data:', proxyData);

            if (!proxyData.contents) {
                 throw new Error("Proxy response did not contain 'contents' field.");
            }

            // Parse the actual geolocation data from the 'contents' string
            const data = JSON.parse(proxyData.contents);
            console.log('TEST V2: Geolocation data received via proxy:', data);

            if (data.status === 'success' && data.lat && data.lon) {
                mapStatusDiv.textContent = `TEST V2 SUCCESSFUL! Received location for ${data.query} via proxy: Lat ${data.lat}, Lon ${data.lon}`;
                // Plot a single marker for success
                L.marker([data.lat, data.lon])
                 .addTo(map)
                 .bindPopup(`Successfully located ${data.query} via proxy`)
                 .openPopup();
                map.setView([data.lat, data.lon], 5);
            } else {
                mapStatusDiv.textContent = `TEST V2 FAILED: API (via proxy) returned status '${data.status}' for ${data.query}. Check console.`;
            }

        } catch (error) {
            console.error('TEST V2: An error occurred during the proxy fetch test:', error);
            mapStatusDiv.textContent = `TEST V2 FAILED: Error during proxy fetch: ${error.message}. Check console.`;
        }
    }

    runTestViaProxy();

}); // End DOMContentLoaded
