// --- Using iplocality.com VIA PROXY ---
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
    const initialProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(realityNetUrl)}`;
    // iplocality API base URL (HTTPS)
    const geoApiBaseUrl = 'https://iplocality.com/';
    // Base URL for the proxy
    const proxyBaseUrl = 'https://api.allorigins.win/get?url=';

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
            const nodeResponse = await fetch(initialProxyUrl);
            if (!nodeResponse.ok) throw new Error(`Failed to fetch node list: ${nodeResponse.statusText}`);
            const initialProxyData = await nodeResponse.json();
             if (!initialProxyData.contents) throw new Error("Proxy response for node list missing 'contents'.");
            nodesData = JSON.parse(initialProxyData.contents);
            if (!Array.isArray(nodesData)) throw new Error("Node data is not an array.");
            mapStatusDiv.textContent = `Found ${nodesData.length} nodes. Fetching locations via proxy...`;

            // 2. Get Unique IPs
            const uniqueIPs = [...new Set(nodesData.map(node => node.ip).filter(ip => ip))];
             console.log('Using iplocality.com VIA PROXY - Unique IPs found:', uniqueIPs.length);

            // 3. Fetch Geolocation Data VIA PROXY Individually with Delay
            let fetchedCount = 0;
            for (const ip of uniqueIPs) {
                fetchedCount++;
                mapStatusDiv.textContent = `Workspaceing location for IP ${fetchedCount} of <span class="math-inline">\{uniqueIPs\.length\} via proxy\.\.\. \(</span>{ip})`;
                try {
                    // Construct TARGET URL for iplocality
                    const targetGeoUrl = geoApiBaseUrl + ip;
                    // Construct PROXY URL for iplocality request
                    const proxyGeoUrl = proxyBaseUrl + encodeURIComponent(targetGeoUrl);

                    // Fetch VIA PROXY
                    const geoResponse = await fetch(proxyGeoUrl);

                    if (!geoResponse.ok) {
                         // Log error from the proxy itself
                        console.warn(`PROXY Geolocation failed for ${ip}: ${geoResponse.status} ${geoResponse.statusText}`);
                        await new Promise(resolve => setTimeout(resolve, 150)); // Delay
                        continue; // Skip to the next IP
                    }

                    // Parse the PROXY response
                    const proxyData = await geoResponse.json();
                     console.log(`Proxy response for ${ip}:`, proxyData);

                    if (!proxyData.contents) {
                       console.warn(`Proxy response missing 'contents' for ${ip}. Original status may have been error.`);
                       await new Promise(resolve => setTimeout(resolve, 150)); // Delay
                       continue;
                   }

                    // Parse the ACTUAL location data from the proxy's contents
                    const locationData = JSON.parse(proxyData.contents);
                    console.log(`Location data for ${ip} (via proxy):`, locationData);

                    // Store successful results if lat/lon exist
                    if (locationData && locationData.latitude !== undefined && locationData.longitude !== undefined) {
                        // Ensure lat/lon are numbers before storing
                        const lat = parseFloat(locationData.latitude);
                        const lon = parseFloat(locationData.longitude);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            geoData[ip] = { lat: lat, lon: lon, city: locationData.city, country: locationData.country };
                        } else {
                            console.warn(`Parsed lat/lon are not valid numbers for ${ip}:`, locationData);
                        }
                    } else {
                         console.warn(`Geolocation data missing lat/lon for ${ip} (via proxy):`, locationData);
                    }

                } catch (ipError) {
                     console.error(`Error fetching/processing proxied geolocation for ${ip}:`, ipError);
                     // Continue to next IP even if one errors out completely
                }
                 // Add delay between requests
                 await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay
            } // End IP loop


            mapStatusDiv.textContent = `Processing ${Object.keys(geoData).length} successfully geolocated IPs. Plotting nodes...`;
            console.log('Populated geoData (iplocality via proxy):', geoData);

            // 4. Plot Nodes on Map
            let plottedCount = 0;
            nodesData.forEach(node => {
                const location = geoData[node.ip];
                 // Check location and ensure lat/lon are valid numbers
                if (location && typeof location.lat === 'number' && typeof location.lon === 'number') {
                    const icon = node.state === 'Ready' ? readyIcon : waitingIcon;
                    const marker = L.marker([location.lat, location.lon], { icon: icon });

                    marker.bindPopup(`
                        <b>ID:</b> ${shortenId(node.id)}<br>
                        <b>IP:</b> ${node.ip}<br>
                        <b>Status:</b> ${node.state}<br>
                        <b>City:</b> ${location.city || 'N/A'}<br>
                        <b>Country:</b> ${location.country || 'N/A'}
                    `);

                    marker.addTo(map);
                    plottedCount++;
                } else if (node.ip && !geoData[node.ip]) {
                    // Log IPs that were in the list but couldn't be geolocated/plotted
                     console.log(`Node <span class="math-inline">\{node\.id\} \(</span>{node.ip}) not plotted - location data missing or invalid.`);
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
