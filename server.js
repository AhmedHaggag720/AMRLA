const express = require("express");
const app = express();
const port = 3000;
const axios = require("axios");
const fs = require("fs");
const logToFile = require("./logger");

// === Telegram Notifier ===
function sendTelegramMessage(text) {
  const token = "7640388136:AAGv6v8ID6ckN_MPkVXqxMG-fySCr09bsbw"; // Replace with your bot token
  //hamada 1874484638
  //amr 8174788006
  const chatId = "8174788006"; // Replace with your chat ID
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  axios
    .post(url, {
      chat_id: chatId,
      text: text,
    })
    .then(() => {
      logToFile("Telegram message sent");
    })
    .catch((err) => {
      console.error("Telegram error:", err.message);
    });
}

let resAccessToken = null;
let listings = null;

app.use(express.json());

// === Manual Listings Fetch Route ===
app.post("/fetch-listings", (req, res) => {
  logToFile("Manual listings fetch triggered");

  // Start the first fetch immediately
  fetchListings("Manual");

  // Set an interval to fetch listings every 6 seconds after the request
  const fetchInterval = setInterval(() => {
    fetchListings("Manual");
  }, 6000);

  // Set a timeout to stop fetching after a certain amount of time (e.g., 1 minute)
  setTimeout(() => {
    clearInterval(fetchInterval); // Stop the interval after 1 minute
    logToFile("Manual listings fetch interval stopped");
  }, 60000); // Stops after 60 seconds (1 minute)

  res.json({ message: "Listings fetch started" });
});


// === Logger Route HTML Page (Auto-Updating) ===
app.get("/logs", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Live Logs</title>
      <style>
        body {
          margin: 0;
          font-family: monospace;
          background-color: #f9f9f9;
          color: #333;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        header {
          background-color: #ffffff;
          padding: 15px 20px;
          font-size: 1.4em;
          font-weight: bold;
          color: #007acc;
          border-bottom: 1px solid #ddd;
        }
        #logContainer {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
          white-space: pre-wrap;
          line-height: 1.6;
          background-color: #fff;
        }
      </style>
    </head>
    <body>
      <header>📄 Live Logs</header>
      <div id="logContainer"><pre id="logContent">Loading...</pre></div>
      <script>
        async function fetchLogs() {
          try {
            const res = await fetch('/logs/raw');
            const text = await res.text();
            const logEl = document.getElementById('logContent');
            const container = document.getElementById('logContainer');
            const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;

            logEl.textContent = text;
            if (atBottom) {
              container.scrollTop = container.scrollHeight;
            }
          } catch (err) {
            console.error('Error fetching logs:', err);
          }
        }
        fetchLogs();
        setInterval(fetchLogs, 2000);
      </script>
    </body>
    </html>
  `);
});

// === Raw Log File Access Route ===
app.get("/logs/raw", (req, res) => {
  const logFilePath = "./logs.txt";
  fs.readFile(logFilePath, "utf8", (err, data) => {
    if (err) return res.status(500).send("Error reading log file");
    res.setHeader("Content-Type", "text/plain");
    res.send(data);
  });
});

// === Root Welcome Route ===
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the basic Node.js app!" });
});

// === Get Token Function ===
function getAccessToken() {
  logToFile("Auto token fetch triggered");

  const url =
    "https://securetoken.googleapis.com/v1/token?key=AIzaSyC9vC7PK7rW3N6yQT1PdGeeY1-rvB2pAqU";
  const headers = {
    "Accept-Encoding": "gzip",
    "Accept-Language": "en-US",
    Connection: "Keep-Alive",
    "Content-Length": "294",
    "Content-Type": "application/json",
    Host: "securetoken.googleapis.com",
    "User-Agent":
      "Dalvik/2.1.0 (Linux; U; Android 14; Galaxy S9 Build/UP1A.231105.003.A1)",
  };
  const body = {
    grantType: "refresh_token",
    refreshToken:
      "AMf-vByfKpLji9mGut4ltS1l6_gk929TFO5HNVBenHdiUUCPqzJXQFS4UXfFXWt5xtTojCpXvnzXTQp5zPNp4Oxf2g_rq2n-EmUJc4eV5tdMT2Yl4fgo3L_9oCfi_ttsfeMFJ45dGrRpPTPtLrZPg4T-CaftMxg9lMTCYn6N8kVd3teI_I8vQMLiXUJVT3fjda2DGtq-UloSwETm3gNTChkLBTZrfhOL48MtNzt5j1MzHPsCOfEO6-4",
  };

  axios
    .post(url, body, { headers })
    .then((response) => {
      resAccessToken = response.data.access_token;
      logToFile("Access token fetched successfully (auto)");
    })
    .catch((error) => {
      logToFile("Auto token fetch error: " + error.message);
    });
}

// === Unified Fetch Listings Function ===
// === Unified Fetch Listings Function ===
function fetchListings(logPrefix = "Auto") {
  if (!resAccessToken) {
    return logToFile("No access token. Skipping listings fetch.");
  }

  const url = "https://api.workwhilejobs.com/graphql";
  const headers = {
    accept: "application/json",
    "Accept-Encoding": "gzip",
    "app-gql-context": "listings_tab",
    "app-source": "workerapp",
    "app-version": "2.56.0",
    authorization: `${resAccessToken}`,
    Connection: "Keep-Alive",
    "Content-Type": "application/json",
    Host: "api.workwhilejobs.com",
    platformos: "android",
    timezone: "America/Los_Angeles",
    "User-Agent": "okhttp/4.12.0",
  };
  const body = {
    query: `query {
      me {
        listings2 (
          listingsFilter: "open",
          categories: ["Driving"],
          distanceThresholdMiles: 64
        ) {
          items {
            id
            company { name }
            position { name }
            location { address { city, state } }
          }
        }
      }
    }`,
  };

  axios
    .post(url, body, { headers })
    .then((response) => {
      listings = response.data.data.me.listings2.items;

      function containsWord(obj, word) {
        if (typeof obj === "string") return obj.includes(word);
        if (Array.isArray(obj))
          return obj.some((item) => containsWord(item, word));
        if (typeof obj === "object" && obj !== null)
          return Object.values(obj).some((value) => containsWord(value, word));
        return false;
      }
//hi
      const matches = listings.filter((item) => containsWord(item,"459764"));
      const matchLog =
        `${logPrefix} listing match:\n` + JSON.stringify(matches, null, 2);
      logToFile(matchLog);

      // Only send the message if matches were found
      if (matches.length > 0) {
        sendTelegramMessage(matchLog);
      }
    })
    .catch((err) => {
      logToFile(`${logPrefix} listings fetch error: ` + err.message);
    });
}

// === Manual /tokens Route ===
app.post("/tokens", (req, res) => {
  logToFile("Manual token refresh triggered");
  getAccessToken();
  res.json({ message: "Token refresh triggered" });
});

// === 404 Handler ===
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// === Start Server & Auto Execution ===
app.listen(port, () => {
  logToFile(`Server running on http://localhost:${port}`);
  getAccessToken();
});

// Refresh tokens every 55 minutes and fetch listings every 6 seconds
setInterval(getAccessToken, 55 * 60 * 1000);
setInterval(() => fetchListings("Auto"), 6000);
