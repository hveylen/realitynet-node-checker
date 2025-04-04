// Get references to the HTML elements we need to interact with
const nodeIdInput = document.getElementById('nodeIdInput');
const checkButton = document.getElementById('checkButton');
const resultArea = document.getElementById('resultArea');

// The URL provided by the RealityNet team
const realityNetUrl = 'http://68.183.10.93:9000/cluster/info';

// --- Using the allorigins.win CORS proxy ---
// We need to encode the target URL before appending it to the proxy URL
const encodedUrl = encodeURIComponent(realityNetUrl);
const proxyUrl = `https://api.allorigins.win/get?url=${encodedUrl}`;
// Note: If allorigins.win is down, this won't work.
// A direct fetch would be: fetch(realityNetUrl), but likely blocked by CORS.

// Add an event listener to the button: when clicked, run the checkNodeStatus function
checkButton.addEventListener('click', checkNodeStatus);

// Define the main function to check the node status
async function checkNodeStatus() {
    const nodeIdToFind = nodeIdInput.value.trim(); // Get the Node ID from input and remove whitespace

    // Basic validation: Check if the user entered anything
    if (!nodeIdToFind) {
        resultArea.innerHTML = '<span class="status-error">Please enter a Node ID.</span>';
        return; // Stop the function here
    }

    // Provide feedback to the user while fetching
    resultArea.innerHTML = 'Checking... Please wait.';
    checkButton.disabled = true; // Disable button during check

    try {
        // Fetch the data using the CORS proxy URL
        const response = await fetch(proxyUrl);

        // Check if the fetch itself was successful (e.g., network connection ok)
        if (!response.ok) {
            // response.statusText gives the HTTP error reason (e.g., "Not Found", "Internal Server Error")
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }

        // The proxy wraps the actual response. We need to parse the proxy's JSON first.
        const proxyData = await response.json();

        // The actual content fetched from realityNetUrl is inside the 'contents' property
        // We need to parse this content *again* as it's a JSON string
        const nodesData = JSON.parse(proxyData.contents);

        // Check if nodesData is actually an array (as expected)
        if (!Array.isArray(nodesData)) {
            throw new Error("Fetched data is not in the expected format (array of nodes).");
        }

        // Find the node with the matching ID
        const foundNode = nodesData.find(node => node.id === nodeIdToFind);

        // Display the result
        if (foundNode) {
            // Node found! Display its details.
            let statusClass = '';
            if (foundNode.state === 'Ready') {
                statusClass = 'status-ready';
            } else {
                // Apply 'waiting' style to any non-Ready state
                statusClass = 'status-waiting';
            }

            resultArea.innerHTML = `
                <strong>Node Found!</strong><br>
                ID: ${foundNode.id}<br>
                IP: ${foundNode.ip}<br>
                Public Port: ${foundNode.publicPort}<br>
                Status: <span class="${statusClass}">${foundNode.state}</span>
            `;
        } else {
            // Node not found in the list
            resultArea.innerHTML = `<span class="status-notfound">Node ID "${nodeIdToFind}" not found in the current list.</span>`;
        }

    } catch (error) {
        // Handle any errors during fetch, parsing, or processing
        console.error('Error checking node status:', error); // Log the error for debugging
        resultArea.innerHTML = `<span class="status-error">Error: ${error.message}. Could not retrieve or process node data. Check the console for more details. (Is the RealityNet server or the CORS proxy online?)</span>`;
    } finally {
        // Re-enable the button regardless of success or failure
        checkButton.disabled = false;
    }
}