// --- Using iplocality.com ---
document.addEventListener('DOMContentLoaded', () => {

    const mapStatusDiv = document.getElementById('mapStatus');
    const map = L.map('map').setView([20, 0], 2); // Initialize map

    // Add CartoDB Dark Matter Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    mapStatusDiv.textContent = 'Fetching node list...';

    // --- URLs ---
    const realityNetUrl = 'http://68.183.10.93:9000/cluster/info';
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(realityNetUrl)}`;
    // iplocality API base URL (HTTPS)
    const geoApiBaseUrl = 'https://iplocality.com/';

    // --- Marker Icons ---
    function createColoredIcon(color) {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<span style="background-color:${color}; width:12px; height:12px; display:block; border-radius:50%; border: 1px solid rgba(255,255,255,0.5);"></span>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
    }
    const readyIcon = createColoredIcon('lime');
    const waitingIcon = createColoredIcon('yellow');

    // --- Fetch Node Data and Process ---
    async function loadNodesAndMap() {
        let nodesData = [];
        // Use an object to store geo data keyed by IP for efficient lookup
        let geoData = {};

        try {
            // 1. Fetch Node List via Proxy
            mapStatusDiv.textContent = 'Fetching node list...';
            const nodeResponse = await fetch(proxyUrl);
            if (!nodeResponse.ok) throw new Error(`Failed to fetch node list: ${nodeResponse.statusText}`);
            const proxyData = await nodeResponse.json();
            nodesData = JSON.parse(proxyData.contents);
            if (!Array.isArray(nodesData)) throw new Error("Node data is not an array.");
            mapStatusDiv.textContent = `Found ${nodesData.length} nodes. Fetching locations...`;

            // 2. Get Unique IPs
            const uniqueIPs = [...new Set(nodesData.map(node => node.ip).filter(ip => ip))];
            console.log('Using iplocality.com - Unique IPs found:', uniqueIPs.length);

            // 3. Fetch Geolocation Data Individually with Delay
            let fetchedCount = 0;
            for (const ip of uniqueIPs) {
                fetchedCount++;
                mapStatusDiv.textContent = `Workspaceing location for IP ${fetchedCount} of <span class="math-inline">\{uniqueIPs\.length\}\.\.\. \(</span>{ip})`;
                try {
                    // Construct URL for iplocality
                    const geoUrl = geoApiBaseUrl + ip; // Use simple concatenation
                    // Fetch directly (iplocality seems CORS friendly, uses HTTPS)
                    const geoResponse = await fetch(geoUrl);

                    if (!geoResponse.ok) {
                        // Log error but continue if a single IP lookup fails
                        console.warn(`Geolocation failed for ${ip}: ${geoResponse.status} ${geoResponse.statusText}`);
                        // Add a small delay even on failure before next request
                        await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay
                        continue; // Skip to the next IP
                    }

                    const locationData = await geoResponse.json();
                    console.log(`Location data for ${ip}:`, locationData);

                    // Store successful results if lat/lon exist
                    if (locationData && locationData.latitude !== undefined && locationData.longitude !== undefined) {
                        geoData[ip] = { lat: locationData.latitude, lon: locationData.longitude };
                    } else {
                         console.warn(`Geolocation data missing lat/lon for ${ip}:`, locationData);
                    }

                } catch (ipError) {
                     console.error(`Error fetching geolocation for ${ip}:`, ipError);
                     // Continue to next IP even if one errors out completely
                }
                 // Add a small delay between successful/failed requests to be polite
                 await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay
            } // End IP loop


            mapStatusDiv.textContent = `Processing ${Object.keys(geoData).length} successfully geolocated IPs. Plotting nodes...`;
            console.log('Populated geoData (iplocality):', geoData);

            // 4. Plot Nodes on Map
            let plottedCount = 0;
            nodesData.forEach(node => {
                const location = geoData[node.ip];
                if (location && location.lat !== undefined && location.lon !== undefined) {
                    const icon = node.state === 'Ready' ? readyIcon : waitingIcon;
                    const marker = L.marker([location.lat, location.lon], { icon: icon });

                    marker.bindPopup(`
                        <b>ID:</b> ${shortenId(node.id)}<br>
                        <b>IP:</b> ${node.ip}<br>
                        <b>Status:</b> ${node.state}<br>
                        <b>City:</b> ${geoData[node.ip]?.city || 'N/A'}<br> <b>Country:</b> ${geoData[node.ip]?.country || 'N/A'} `); // Note: We didn't request city/country specifically, but they might be in the default response

                    marker.addTo(map);
                    plottedCount++;
                }
            });
            mapStatusDiv.textContent = `Map Loaded. Plotted ${plottedCount} of ${nodesData.length} nodes with valid locations.`;

        } catch (error) {
            console.error("Failed to load map data:", error);
            mapStatusDiv.textContent = `Error: ${error.message}. Failed to load map. Check console.`;
        }
    }

    // Helper function to shorten IDs
    function shortenId(id, startLength = 6, endLength = 6) {
         if (typeof id !== 'string' || id.length <= startLength + endLength + 3) {
            return id;
        }
        return `<span class="math-inline">\{id\.substring\(0, startLength\)\}\.\.\.</span>{id.substring(id.length - endLength)}`;
    }

    // Initial load
    loadNodesAndMap();

}); // End DOMContentLoaded
