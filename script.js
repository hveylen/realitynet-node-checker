// Get references to the HTML elements
const nodeIdsInput = document.getElementById('nodeIdsInput'); // Changed from nodeIdInput
const checkButton = document.getElementById('checkButton');
const resultArea = document.getElementById('resultArea');

// The URL provided by the RealityNet team
const realityNetUrl = 'http://68.183.10.93:9000/cluster/info';

// Using the allorigins.win CORS proxy
const encodedUrl = encodeURIComponent(realityNetUrl);
const proxyUrl = `https://api.allorigins.win/get?url=${encodedUrl}`;

// Add event listener to the button
checkButton.addEventListener('click', checkMultipleNodeStatuses);

// --- Helper function to shorten long IDs ---
function shortenId(id, startLength = 6, endLength = 6) {
    if (typeof id !== 'string' || id.length <= startLength + endLength + 3) {
        return id; // Return original if not a string or too short
    }
    return `${id.substring(0, startLength)}...${id.substring(id.length - endLength)}`;
}

// --- Main function to handle checking potentially multiple nodes ---
async function checkMultipleNodeStatuses() {
    // Get raw input and split into individual IDs
    // Handles separation by comma, newline, or space, and filters out empty entries
    const rawInput = nodeIdsInput.value.trim();
    const nodeIdsToFind = rawInput.split(/[\s,;\n]+/).filter(id => id.length > 0);

    // Basic validation
    if (nodeIdsToFind.length === 0) {
        resultArea.innerHTML = '<span class="status-error">Please enter at least one Node ID.</span>';
        return;
    }

    // Provide feedback and disable button
    resultArea.innerHTML = 'Checking... Please wait.';
    checkButton.disabled = true;
    let resultsHtml = ''; // Accumulate results here
    let fetchedNodesData = null; // Store fetched data to avoid multiple fetches

    try {
        // --- Fetch the data ONCE for all checks ---
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        const proxyData = await response.json();
        fetchedNodesData = JSON.parse(proxyData.contents);

        if (!Array.isArray(fetchedNodesData)) {
            throw new Error("Fetched data is not in the expected format (array of nodes).");
        }
        // --- Data fetched successfully ---

        // --- Now process each requested Node ID ---
        nodeIdsToFind.forEach((nodeIdToFind, index) => {
            if (index > 0) {
                resultsHtml += '<hr class="result-separator">'; // Add separator between results
            }

            const foundNode = fetchedNodesData.find(node => node.id === nodeIdToFind);
            const shortId = shortenId(nodeIdToFind); // Shorten the ID we searched for

            if (foundNode) {
                // Node found!
                let statusClass = foundNode.state === 'Ready' ? 'status-ready' : 'status-waiting';
                const displayId = shortenId(foundNode.id); // Shorten the ID from the result

                // Safely access properties, providing 'N/A' if missing
                const ip = foundNode.ip || 'N/A';
                const publicPort = foundNode.publicPort !== undefined ? foundNode.publicPort : 'N/A';
                const p2pPort = foundNode.p2pPort !== undefined ? foundNode.p2pPort : 'N/A';
                const session = foundNode.session || 'N/A';
                const state = foundNode.state || 'Unknown';

                resultsHtml += `
                    <div class="node-result">
                        <strong>Result for ID: ${shortId}</strong><br>
                        IP: ${ip}<br>
                        Public Port: ${publicPort}<br>
                        P2P Port: ${p2pPort}<br>
                        Session: ${session}<br>
                        Status: <span class="${statusClass}">${state}</span>
                    </div>
                `;
            } else {
                // Node not found
                resultsHtml += `
                    <div class="node-result">
                        <strong>Result for ID: ${shortId}</strong><br>
                        <span class="status-notfound">Node ID not found in the current list.</span>
                    </div>
                `;
            }
        });

        resultArea.innerHTML = resultsHtml; // Display accumulated results

    } catch (error) {
        // Handle errors during the initial fetch or parsing
        console.error('Error checking node status:', error);
        resultArea.innerHTML = `<span class="status-error">Error: ${error.message}. Could not retrieve or process node data. Check the console.</span>`;
    } finally {
        // Re-enable the button
        checkButton.disabled = false;
    }
}
