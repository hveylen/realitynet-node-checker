// Wait for the HTML document to be fully loaded before running map code
document.addEventListener('DOMContentLoaded', () => {

    const mapStatusDiv = document.getElementById('mapStatus');

    // --- Initialize Leaflet Map ---
    // Centered roughly mid-Atlantic, zoomed out
    const map = L.map('map').setView([20, 0], 2);

    // --- Add a Tile Layer (Map Background) ---
    // Using CartoDB Dark Matter tiles - looks good with the dark theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Add alternative using OpenStreetMap with CSS filter (if CartoDB fails)
    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    //     className: 'map-tiles-dark' // Apply CSS filter
    // }).addTo(map);

    // Display initial status
    mapStatusDiv.textContent = 'Fetching node list...';

    // --- URLs ---
    const realityNetUrl = 'http://68.183.10.93:9000/cluster/info';
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(realityNetUrl)}`;
    const geoApiUrl = 'https://ip-api.com/batch'; // Batch endpoint (Use HTTPS!)

    // --- Marker Icons ---
    // Simple CSS-based circular icons
    function createColoredIcon(color) {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<span style="background-color:${color}; width:12px; height:12px; display:block; border-radius:50%; border: 1px solid rgba(255,255,255,0.5);"></span>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6] // Center the icon
        });
    }
    const readyIcon = createColoredIcon('lime'); // Green for Ready
    const waitingIcon = createColoredIcon('yellow'); // Yellow for others

    // --- Fetch Node Data and Process ---
    async function loadNodesAndMap() {
        let nodesData = [];
        let geoData = {}; // Store results like { "ip": {lat: ..., lon: ...}, ... }

        try {
            // 1. Fetch Node List via Proxy
            mapStatusDiv.textContent = 'Fetching node list...';
            const nodeResponse = await fetch(proxyUrl);
            if (!nodeResponse.ok) throw new Error(`Failed to fetch node list: ${nodeResponse.statusText}`);
            const proxyData = await nodeResponse.json();
            nodesData = JSON.parse(proxyData.contents);
            if (!Array.isArray(nodesData)) throw new Error("Node data is not an array.");
            mapStatusDiv.textContent = `Found ${nodesData.length} nodes. Fetching locations...`;

            // 2. Prepare IP Addresses for Geolocation
            // Get unique IP addresses from the node list
            const uniqueIPs = [...new Set(nodesData.map(node => node.ip).filter(ip => ip))]; // Filter out any null/empty IPs

            // 3. Fetch Geolocation Data in Batches (max 100 per request for ip-api.com)
            const batchSize = 100;
            for (let i = 0; i < uniqueIPs.length; i += batchSize) {
                const ipBatch = uniqueIPs.slice(i, i + batchSize);
                mapStatusDiv.textContent = `Workspaceing locations for IPs ${i + 1}-${Math.min(i + batchSize, uniqueIPs.length)} of ${uniqueIPs.length}...`;

                // Make POST request to ip-api batch endpoint
                // We specify 'lat,lon,query' fields to get only what we need
                // Trying direct fetch first (ip-api usually supports CORS)
                const geoResponse = await fetch(geoApiUrl + '?fields=lat,lon,query', {
                    method: 'POST',
                    body: JSON.stringify(ipBatch)
                });

                if (!geoResponse.ok) {
                    console.warn(`Geolocation batch ${i / batchSize + 1} failed: ${geoResponse.statusText}. Some locations may be missing.`);
                    continue; // Skip this batch on error, try the next
                }

                const geoBatchResult = await geoResponse.json();
                if (!Array.isArray(geoBatchResult)) {
                     console.warn(`Geolocation batch ${i / batchSize + 1} returned invalid data.`);
                     continue;
                }

                // Store successful results keyed by IP ('query' field in response)
                geoBatchResult.forEach(result => {
                    if (result.status === 'success' && result.query) {
                        geoData[result.query] = { lat: result.lat, lon: result.lon };
                    }
                });
                 await new Promise(resolve => setTimeout(resolve, 1100)); // Wait ~1 second between batches to respect potential rate limits (ip-api free limit is 45 req/min)
            }
            mapStatusDiv.textContent = `Processing ${Object.keys(geoData).length} locations. Plotting nodes...`;


            // 4. Plot Nodes on Map
            let plottedCount = 0;
            nodesData.forEach(node => {
                const location = geoData[node.ip]; // Find location using IP
                if (location && location.lat && location.lon) {
                    const icon = node.state === 'Ready' ? readyIcon : waitingIcon;
                    const marker = L.marker([location.lat, location.lon], { icon: icon });

                    // Add popup info
                    marker.bindPopup(`
                        <b>ID:</b> ${shortenId(node.id)}<br>
                        <b>IP:</b> ${node.ip}<br>
                        <b>Status:</b> ${node.state}<br>
                        <b>Public Port:</b> ${node.publicPort || 'N/A'}<br>
                        <b>P2P Port:</b> ${node.p2pPort || 'N/A'}<br>
                        <b>Session:</b> ${shortenId(node.session, 8, 8) || 'N/A'}
                    `);

                    marker.addTo(map);
                    plottedCount++;
                }
            });
            mapStatusDiv.textContent = `Map Loaded. Plotted ${plottedCount} of ${nodesData.length} nodes with valid locations.`;


        } catch (error) {
            console.error("Failed to load map data:", error);
            mapStatusDiv.textContent = `Error: ${error.message}. Failed to load map.`;
        }
    }

    // Helper function to shorten IDs (same as in script.js)
    function shortenId(id, startLength = 6, endLength = 6) {
         if (typeof id !== 'string' || id.length <= startLength + endLength + 3) {
            return id;
        }
        return `${id.substring(0, startLength)}...${id.substring(id.length - endLength)}`;
    }


    // Initial load
    loadNodesAndMap();

}); // End DOMContentLoaded
