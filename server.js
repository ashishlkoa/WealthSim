const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const fyersModel = require("fyers-api-v3").fyersModel;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- GLOBAL STATE ---
let activeSymbol = "NSE:NIFTY50-INDEX"; 
let activePositions = []; 
let isMarketDataRunning = false; // 👇 NAYA: Isey sabse upar shift kar diya taaki error na aaye

// --- TOKEN FILE PATH ---
const TOKEN_FILE = path.join(__dirname, 'fyers_token.json');

// --- PAPER TRADING ORDER LOGIC ---
io.on('connection', (socket) => {
    console.log("🟢 Frontend connected to Trading Engine");

    socket.on('change-symbol', (newSymbol) => {
        activeSymbol = newSymbol;
        console.log(`🔄 Symbol changed to: ${activeSymbol}`);
    });

    socket.on('place-order', (orderData) => {
        const trade = {
            id: Date.now(),
            symbol: activeSymbol,
            type: orderData.type,
            quantity: orderData.quantity,
            entryPrice: orderData.price,
            time: new Date().toLocaleTimeString()
        };
        activePositions.push(trade);
        console.log(`✅ Order Executed: ${trade.type} | ${trade.symbol} | Qty: ${trade.quantity} | Price: ₹${trade.entryPrice}`);
        socket.emit('order-success', trade);
    });
});

app.use(express.static(path.join(__dirname, 'public')));

// Fyers API Keys
const appId = "WLDGG5I2CB-200";
const secretKey = "846qieETOqsDBo38";
const redirectUrl = "http://127.0.0.1:3000/callback";

let fyers = new fyersModel();
let accessToken = ""; 

fyers.setAppId(appId);
fyers.setRedirectUrl(redirectUrl);

// --- Smart Data Fetcher ---
// (Function ko bhi upar move kar diya taaki load hote waqt ready rahe)
let liveDataInterval; // Naya variable loop ko rokne ke liye

function startLiveMarketData() {
    if (isMarketDataRunning) return; 
    isMarketDataRunning = true;
    
    console.log(`✅ Live Market Data Started...`);
    
    liveDataInterval = setInterval(async () => {
        try {
            if (!accessToken) return;
            const response = await fyers.getQuotes([activeSymbol]);
            
            // Agar API error de (jaise invalid token)
            if (response && response.s === 'error') {
                console.error("🔴 Fyers API Error:", response.message);
                if(response.message.toLowerCase().includes("token")) {
                    console.log("⚠️ Token expire ho gaya hai. Kripya browser me /login par jaakar dobara login karein.");
                    clearInterval(liveDataInterval); // Loop rok do taaki spam na ho
                    isMarketDataRunning = false;
                }
                return;
            }

            if (response && response.s === 'ok' && response.d && response.d.length > 0) {
                let currentLTP = response.d[0].v.lp; 
                io.emit('market-tick', currentLTP); 
            }
        } catch (error) {
            console.error("Live Price Fetch Error:", error.message);
        }
    }, 1000); 
}

// --- LOAD SAVED TOKEN ON STARTUP ---
if (fs.existsSync(TOKEN_FILE)) {
    try {
        const fileData = fs.readFileSync(TOKEN_FILE, 'utf8');
        const parsedData = JSON.parse(fileData);
        if (parsedData.access_token) {
            accessToken = parsedData.access_token;
            fyers.setAccessToken(accessToken);
            console.log("✅ Saved Token Loaded Successfully from file!");
            startLiveMarketData(); 
        }
    } catch (err) {
        console.error("Token load error:", err.message);
    }
}

app.get('/login', (req, res) => {
    let authUrl = fyers.generateAuthCode();
    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    try {
        const authCode = req.query.auth_code;
        if (!authCode) return res.send("Auth code nahi mila.");

        const appIdHash = crypto.createHash('sha256').update(`${appId}:${secretKey}`).digest('hex');

        const response = await fyers.generate_access_token({
            "grant_type": "authorization_code",
            "appIdHash": appIdHash,
            "auth_code": authCode,
            "secret_key": secretKey
        });
        
        if (response.s === 'ok') {
            accessToken = response.access_token;
            fyers.setAccessToken(accessToken);
            
            fs.writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: accessToken }), 'utf8');
            console.log("✅ Fyers Access Token Successfully Generated & Saved!");
            
            startLiveMarketData(); 
            res.redirect('/'); 
        } else {
            res.send(`Token generate fail ho gaya: ${response.message}`);
        }
    } catch (error) {
        res.send("Server error.");
    }
});

// --- History API (For Real Candles) ---
app.get('/api/history', async (req, res) => {
    try {
        if (!accessToken) return res.json({ success: false, message: "Token not found. Please login." });

        const symbol = req.query.symbol || activeSymbol;
        const resolution = req.query.resolution || "1"; 
        
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - 4); 

        const formatDate = (date) => date.toISOString().split('T')[0];

        const response = await fyers.getHistory({
            "symbol": symbol,
            "resolution": resolution,
            "date_format": "1", 
            "range_from": formatDate(pastDate),
            "range_to": formatDate(today),
            "cont_flag": "1"
        });
        
        if (response && response.s === "ok") {
            const formattedData = response.candles.map(candle => ({
                time: candle[0] / 1000, 
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4]
            }));
            res.json({ success: true, data: formattedData });
        } else {
            res.json({ success: false, message: "History data fetch fail ho gaya." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Server running on local network');
});