const express = require("express");
const app = express();
const port = 3000;
const axios = require("axios");
const fs = require("fs");
const logToFile = require("./logger");

// === Telegram Notifier ===
function sendTelegramMessage(text) {
  const token = "7640388136:AAGv6v8ID6ckN_MPkVXqxMG-fySCr09bsbw"; // Replace with your bot token
  const chatIds = ["1874484638", "8174788006"]; // Hamada and Amr

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  chatIds.forEach((chatId) => {
    axios
      .post(url, {
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      })
      .then(() => {
        logToFile(`Telegram message sent to ${chatId}`);
      })
      .catch((err) => {
        console.error(`Telegram error for ${chatId}:`, err.message);
      });
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

app.get("/booknow/:id/:shiftId", async (req, res) => {
  try {
    const { id, shiftId } = req.params;
    const url = `https://api.workwhilejobs.com/v1/me/listing/${id}/accept`;

    const headers = {
      accept: "application/json",
      "Accept-Encoding": "gzip",
      authorization: `${resAccessToken}`,
      platformos: "android",
      timezone: "America/Los_Angeles",
      "User-Agent": "okhttp/4.12.0",
    };

    const body = {
      shift_ids: [`${shiftId}`],
      is_oncall: false,
      mode: "DRIVING",
      duration_minutes: 15.45,
      departure: {
        street: "3053 West Teranimar Drive",
        unit: null,
        zip: "92804",
        city: "Anaheim",
        state: "CA",
        lat: 33.82018,
        long: -117.99616,
      },
    };

    const response = await axios.post(url, body, { headers });

    res.status(200).json({
      message: "Booking request sent successfully.",
      data: response.data,
    });
  } catch (error) {
    console.error("Booking request failed:", error.message);
    res.status(500).json({ error: error.message });
  }
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
    query: `query { me {\n    listings2 (\n      listingsFilter: \"open\",\n      \n      categories: [\"Driving\"] \n       \n      \n      , distanceThresholdMiles: 64\n      \n    ) {\n      cursor\n      items {\n        id\n        bonus, bonusMinNumShifts, bonusEligible,\n        company { companyGroupId, id, name, logoUrl }\n        cancellationPolicy {\n          policyWindows {\n            cutoffTimeHours\n            chargePercentage\n          }\n        }\n        shiftEndPaymentDelayHours\n        minimumPayPolicy{\n          minPayLength\n        }\n        position { \n          id, name, about, requirements, needsCar, needsLicense, needsW2, isTipEligible, isDrivingPosition\n          positionTemplate {\n            id, name\n          }\n          requirements2 {\n            id, name, description, category, credential, isWorkerCredentialMet, documentNeeded, verifiable\n          }\n          mustHaveRequirements{\n            id\n          }\n        }\n        isTryout\n        location { address { street, city, state, zip, lat, long }, distanceFromUser }\n        shifts { \n         assignment {\n            id\n          }\n          id, startsAt, endsAt, pay, payRate, lunchLength, numOpenSpots, numOncallSpots, payOncall, \n          shiftBonuses { amount }, isAvailable, oaiDeduction, createdBy { name } \n          location { address { street, city, state, zip, lat, long } }\n          rosters {\n            id,\n            workers {\n              id\n            }\n          }\n        },\n        tier,\n        totalPay,\n        totalBonus,\n        ineligibleReasons,\n        didJoinWaitlist,\n        restrictions {\n          code\n          workerRequirement {\n            id\n            name\n            description\n            verificationType\n          }\n        }\n      },\n    }\n  } }`,
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
      // Check if any of the listings contain the word 
      const matches = listings.filter((item) => containsWord(item, "WORLDPAC"));

      // Extract all matched IDs
      const matchesFilter = matches.map((item) => {
        id = item.id;
        shift_id = item.shifts?.[0]?.id;

        const originalTime = new Date(item.shifts?.[0]?.startsAt);
        const adjustedTime = new Date(
          originalTime.getTime() - 7 * 60 * 60 * 1000
        );

        // Format: YYYY-MM-DD HH:mm (in UTC-like display)
        const formattedTime = adjustedTime
          .toISOString()
          .replace("T", " ")
          .substring(0, 16);

        const companyUrl = `http://18.189.13.214:3000/booknow/${id}/${shift_id}`;

        return {
          name: item.company.name,
          pay: item.totalPay,
          hyperlink: `<a href="${companyUrl}">Book Now</a>`,
          time: formattedTime,
        };
      });
    
      // Create a readable message for Telegram
      const matchLogForTelegram =
        `listing match:\n\n` +
        matchesFilter
          .map(
            (m) =>
              `Company: ${m.name}\nTime: ${m.time}\nPay: ${m.pay}\n                  ${m.hyperlink}`
          )
          .join("\n\n");

      // Log JSON version for debugging
      logToFile(
        `${logPrefix} listing match (raw data):\n` +
          JSON.stringify(matchesFilter, null, 2)
      );

      // Only send Telegram message if matches were found
      if (matches.length > 0) {
        sendTelegramMessage(matchLogForTelegram);
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

// Refresh tokens every 55 minutes and fetch listings every 10 seconds
setInterval(getAccessToken, 55 * 60 * 1000);
setInterval(() => fetchListings("Auto"), 10000);

function clearLogsDaily() {
  const now = new Date();
  const millisTillMidnight =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) - now;

  setTimeout(() => {
    clearLogs(); // clear once at midnight
    setInterval(clearLogs, 24 * 60 * 60 * 1000); // repeat every 24h after that
  }, millisTillMidnight);
}

function clearLogs() {
  fs.writeFile("./logs.txt", "", (err) => {
    if (err) {
      console.error("Error clearing logs:", err.message);
    } else {
      console.log("Logs cleared at midnight");
    }
  });
}

clearLogsDaily(); // start the schedule
