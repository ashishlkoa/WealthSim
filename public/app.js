// 1. Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAQ0iskBHyrBYG-gDgdFLS7C-EoE78Ef3Y",
    authDomain: "wealthsim-d9179.firebaseapp.com",
    projectId: "wealthsim-d9179",
    storageBucket: "wealthsim-d9179.firebasestorage.app",
    messagingSenderId: "914657379638",
    appId: "1:914657379638:web:a970590f8e4bf3eb4e1f97"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const socket = io();

// 👇 NAYA: ORDER SIDEBAR TOGGLE LOGIC 👇
const orderSidebar = document.getElementById('order-sidebar');
const orderBackdrop = document.getElementById('order-backdrop');
const fabOrder = document.getElementById('fab-order');
const closeOrderBtn = document.getElementById('close-order-btn');

function openOrderPanel() {
    orderSidebar.classList.remove('translate-x-full');
    orderBackdrop.classList.remove('hidden');
}
function closeOrderPanel() {
    orderSidebar.classList.add('translate-x-full');
    orderBackdrop.classList.add('hidden');
}
fabOrder.addEventListener('click', openOrderPanel);
closeOrderBtn.addEventListener('click', closeOrderPanel);
orderBackdrop.addEventListener('click', closeOrderPanel);


// --- BOTTOM DRAWER LOGIC ---
const drawer = document.getElementById('positions-drawer');
const drawerToggle = document.getElementById('drawer-toggle');
const drawerArrow = document.getElementById('drawer-arrow');
let isDrawerOpen = false;

drawerToggle.addEventListener('click', () => {
    isDrawerOpen = !isDrawerOpen;
    if (isDrawerOpen) {
        drawer.classList.remove('translate-y-[calc(100%-48px)]');
        drawer.classList.add('translate-y-0');
        drawerArrow.classList.add('rotate-180');
    } else {
        drawer.classList.add('translate-y-[calc(100%-48px)]');
        drawer.classList.remove('translate-y-0');
        drawerArrow.classList.remove('rotate-180');
    }
});

// --- UI STATE CONTROLS ---
let orderTypeMode = 'MARKET'; 
let orderSideMode = 'BUY'; 

const tabMarket = document.getElementById('tab-market');
const tabLimit = document.getElementById('tab-limit');
const limitPriceContainer = document.getElementById('limit-price-container');
const limitPriceInput = document.getElementById('limit-price-input');

tabMarket.addEventListener('click', () => {
    orderTypeMode = 'MARKET';
    tabMarket.className = "flex-1 text-center py-2 border-b-2 border-blue-600 text-blue-600 cursor-pointer";
    tabLimit.className = "flex-1 text-center py-2 text-slate-400 border-b-2 border-transparent cursor-pointer hover:text-slate-700";
    limitPriceContainer.classList.add('hidden'); limitPriceContainer.classList.remove('flex');
    updateOrderSideUI();
});
tabLimit.addEventListener('click', () => {
    orderTypeMode = 'LIMIT';
    tabLimit.className = "flex-1 text-center py-2 border-b-2 border-blue-600 text-blue-600 cursor-pointer";
    tabMarket.className = "flex-1 text-center py-2 text-slate-400 border-b-2 border-transparent cursor-pointer hover:text-slate-700";
    limitPriceContainer.classList.remove('hidden'); limitPriceContainer.classList.add('flex');
    updateOrderSideUI();
});

const btnBuyToggle = document.getElementById('toggle-buy');
const btnSellToggle = document.getElementById('toggle-sell');
const placeOrderBtn = document.getElementById('place-order-btn');

function updateOrderSideUI() {
    if (currentPosition) {
        placeOrderBtn.className = "w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-bold shadow-md transition";
        placeOrderBtn.innerText = "Update SL / Target";
        return;
    }
    if (orderSideMode === 'BUY') {
        btnBuyToggle.className = "flex-1 py-1.5 md:py-2 rounded-md font-bold text-xs md:text-sm bg-green-500 text-white shadow-sm transition";
        btnSellToggle.className = "flex-1 py-1.5 md:py-2 rounded-md font-bold text-xs md:text-sm text-slate-500 hover:bg-slate-200 transition";
        placeOrderBtn.className = "w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg text-sm font-bold shadow-md transition";
        placeOrderBtn.innerText = orderTypeMode === 'LIMIT' ? "Place Limit BUY" : "Place BUY Order";
    } else {
        btnSellToggle.className = "flex-1 py-1.5 md:py-2 rounded-md font-bold text-xs md:text-sm bg-red-500 text-white shadow-sm transition";
        btnBuyToggle.className = "flex-1 py-1.5 md:py-2 rounded-md font-bold text-xs md:text-sm text-slate-500 hover:bg-slate-200 transition";
        placeOrderBtn.className = "w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg text-sm font-bold shadow-md transition";
        placeOrderBtn.innerText = orderTypeMode === 'LIMIT' ? "Place Limit SELL" : "Place SELL Order";
    }
}
btnBuyToggle.addEventListener('click', () => { orderSideMode = 'BUY'; updateOrderSideUI(); });
btnSellToggle.addEventListener('click', () => { orderSideMode = 'SELL'; updateOrderSideUI(); });

const qtyInput = document.getElementById('qty-input');
document.getElementById('qty-minus').addEventListener('click', () => { qtyInput.value = Math.max(1, (parseInt(qtyInput.value) || 50) - 10); });
document.getElementById('qty-plus').addEventListener('click', () => { qtyInput.value = (parseInt(qtyInput.value) || 50) + 10; });

const tpToggle = document.getElementById('tp-toggle'); const tpInput = document.getElementById('tp-input');
tpToggle.addEventListener('change', (e) => {
    if(e.target.checked) { tpInput.classList.remove('opacity-50', 'pointer-events-none'); tpInput.focus(); } else { tpInput.classList.add('opacity-50', 'pointer-events-none'); tpInput.value = ''; }
});
const slToggle = document.getElementById('sl-toggle'); const slInput = document.getElementById('sl-input');
slToggle.addEventListener('change', (e) => {
    if(e.target.checked) { slInput.classList.remove('opacity-50', 'pointer-events-none'); slInput.focus(); } else { slInput.classList.add('opacity-50', 'pointer-events-none'); slInput.value = ''; }
});

const tabPositionsBtn = document.getElementById('tab-positions'); const tabHistoryBtn = document.getElementById('tab-history');
const positionsTable = document.getElementById('positions-table'); const historyTable = document.getElementById('history-table');

tabPositionsBtn.addEventListener('click', () => {
    tabPositionsBtn.className = "px-4 py-2 text-blue-600 border-b-2 border-blue-600";
    tabHistoryBtn.className = "px-4 py-2 hover:text-slate-900 border-b-2 border-transparent text-slate-500";
    positionsTable.classList.remove('hidden'); historyTable.classList.add('hidden');
});
tabHistoryBtn.addEventListener('click', () => {
    tabHistoryBtn.className = "px-4 py-2 text-blue-600 border-b-2 border-blue-600";
    tabPositionsBtn.className = "px-4 py-2 hover:text-slate-900 border-b-2 border-transparent text-slate-500";
    historyTable.classList.remove('hidden'); positionsTable.classList.add('hidden'); loadHistory(); 
});

// --- Chart Setup (Light Theme) ---
const chartContainer = document.getElementById('tvchart');
const chart = LightweightCharts.createChart(chartContainer, {
    layout: { background: { type: 'solid', color: '#ffffff' }, textColor: '#1e293b' },
    grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    timeScale: { timeVisible: true, secondsVisible: false }
});
const candleSeries = chart.addCandlestickSeries({
    upColor: '#089981', downColor: '#f23645', borderVisible: false, wickUpColor: '#089981', wickDownColor: '#f23645'
});
new ResizeObserver(entries => {
    if (entries.length === 0 || entries[0].target !== chartContainer) return;
    const newRect = entries[0].contentRect;
    chart.applyOptions({ height: newRect.height, width: newRect.width });
}).observe(chartContainer);

// --- FLOATING PNL RECTANGLE BOX LOGIC ---
const pnlFloatingBox = document.getElementById('pnl-floating-box');

function updateFloatingPnLBox() {
    if (!currentPosition || currentLTP === 0) {
        pnlFloatingBox.classList.add('hidden'); return;
    }
    const coord = candleSeries.priceToCoordinate(currentPosition.entryPrice);
    if (coord === null) {
        pnlFloatingBox.classList.add('hidden'); return;
    }
    
    let pnl = currentPosition.type === 'BUY' 
        ? (currentLTP - currentPosition.entryPrice) * currentPosition.qty 
        : (currentPosition.entryPrice - currentLTP) * currentPosition.qty;
    
    pnlFloatingBox.classList.remove('hidden');
    pnlFloatingBox.style.top = `${coord}px`;
    
    let pnlString = pnl >= 0 ? `+ ₹${pnl.toFixed(2)}` : `₹${pnl.toFixed(2)}`;
    pnlFloatingBox.innerText = `${currentPosition.qty} | ${pnlString}`;
    
    if (pnl >= 0) {
        pnlFloatingBox.className = "absolute z-10 text-[11px] md:text-xs font-bold px-2 py-1 rounded border shadow-sm transform -translate-y-1/2 right-16 transition-colors bg-green-50 text-green-700 border-green-300";
    } else {
        pnlFloatingBox.className = "absolute z-10 text-[11px] md:text-xs font-bold px-2 py-1 rounded border shadow-sm transform -translate-y-1/2 right-16 transition-colors bg-red-50 text-red-700 border-red-300";
    }
}

chart.timeScale().subscribeVisibleTimeRangeChange(updateFloatingPnLBox);
chart.timeScale().subscribeVisibleLogicalRangeChange(updateFloatingPnLBox);

// --- Real Market Data ---
let lastCandle = null;
let currentSymbol = "NSE:NIFTY50-INDEX";

async function fetchRealCandles(symbol) {
    try {
        const response = await fetch(`/api/history?symbol=${symbol}&resolution=1`);
        const result = await response.json();
        if (result.success && result.data.length > 0) {
            candleSeries.setData(result.data);
            lastCandle = result.data[result.data.length - 1]; 
            chart.timeScale().fitContent();
        }
    } catch (error) { console.error(error); }
}
fetchRealCandles(currentSymbol); 

document.getElementById('load-symbol-btn').addEventListener('click', () => {
    const newSymbol = document.getElementById('symbol-input').value.trim();
    if (!newSymbol) return;
    if (currentPosition || pendingOrder) return alert("Pehle open/pending position close karein!");
    currentSymbol = newSymbol;
    let shortName = newSymbol.includes('-') ? newSymbol.split(':')[1].split('-')[0] : newSymbol.split(':')[1];
    document.getElementById('active-symbol-display').innerText = shortName || newSymbol;
    document.getElementById('ltp').innerText = "Loading...";
    currentLTP = 0; 
    socket.emit('change-symbol', currentSymbol);
    fetchRealCandles(currentSymbol);
});

// --- ORDER STATE ---
let currentPosition = null; 
let pendingOrder = null; 
let entryPriceLine = null;  
let tpLine = null; 
let slLine = null; 
let pendingLimitLine = null; 
let currentLTP = 0; 
let walletBalance = 100000; 

const drawerPnlDisplay = document.getElementById('drawer-live-pnl');
const ltpDisplay = document.getElementById('ltp');
const walletDisplay = document.getElementById('wallet-balance');
const positionsContainerTable = document.getElementById('positions-container-table');

async function loadSavedData() {
    try {
        const docSnap = await getDoc(doc(db, "portfolio", "myAccount"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.walletBalance !== undefined) walletBalance = data.walletBalance;
            walletDisplay.innerText = `₹${walletBalance.toFixed(2)}`;

            if (data.activePosition) {
                currentPosition = data.activePosition;
                drawOrderUI(currentPosition.type, currentPosition.qty, currentPosition.entryPrice, currentPosition.symbol, currentPosition.tp, currentPosition.sl);
            }
            if (data.pendingOrder) {
                pendingOrder = data.pendingOrder;
                drawPendingOrderUI(pendingOrder);
            }
        }
    } catch (e) { console.error(e); }
    updateOrderSideUI();
}
loadSavedData();

function drawPendingOrderUI(order) {
    if (pendingLimitLine) { candleSeries.removePriceLine(pendingLimitLine); }
    pendingLimitLine = candleSeries.createPriceLine({
        price: order.limitPrice, color: '#2962FF', lineWidth: 2, 
        lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true, title: `PENDING ${order.qty}`,
    });

    let shortName = order.symbol.includes('-') ? order.symbol.split(':')[1].split('-')[0] : order.symbol;
    positionsContainerTable.innerHTML = `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="p-2 md:p-3 font-bold text-slate-800">${shortName}</td>
            <td class="p-2 md:p-3 font-bold ${order.type==='BUY'?'text-blue-600':'text-red-500'}">${order.type}</td>
            <td class="p-2 md:p-3">${order.qty}</td>
            <td class="p-2 md:p-3">₹${order.limitPrice}</td>
            <td class="p-2 md:p-3">-</td>
            <td class="p-2 md:p-3 text-slate-400">Waiting</td>
            <td class="p-2 md:p-3"><button onclick="cancelPendingOrder()" class="border border-slate-300 text-slate-600 hover:bg-slate-100 px-2 py-1 rounded text-xs transition font-semibold">Cancel</button></td>
        </tr>
    `;
    
    if (!isDrawerOpen) drawerToggle.click();
}

window.cancelPendingOrder = async function() {
    pendingOrder = null;
    if (pendingLimitLine) { candleSeries.removePriceLine(pendingLimitLine); pendingLimitLine = null; }
    positionsContainerTable.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-slate-400">No active positions</td></tr>`;
    try { await setDoc(doc(db, "portfolio", "myAccount"), { pendingOrder: null }, { merge: true }); } catch (e) {}
};

function drawOrderUI(type, qty, entryPrice, symbol = currentSymbol, tpPrice = null, slPrice = null) {
    if (entryPriceLine) { candleSeries.removePriceLine(entryPriceLine); entryPriceLine = null; }
    if (tpLine) { candleSeries.removePriceLine(tpLine); tpLine = null; }
    if (slLine) { candleSeries.removePriceLine(slLine); slLine = null; }
    
    entryPriceLine = candleSeries.createPriceLine({
        price: entryPrice, color: '#2962FF', lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid, axisLabelVisible: true, title: `ENTRY`,
    });

    if (tpPrice) {
        tpLine = candleSeries.createPriceLine({
            price: tpPrice, color: '#089981', lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid, axisLabelVisible: true, title: `TARGET`,
        });
        tpToggle.checked = true; tpInput.value = tpPrice; tpInput.classList.remove('opacity-50', 'pointer-events-none');
    }

    if (slPrice) {
        slLine = candleSeries.createPriceLine({
            price: slPrice, color: '#FF9800', lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid, axisLabelVisible: true, title: `STOP`,
        });
        slToggle.checked = true; slInput.value = slPrice; slInput.classList.remove('opacity-50', 'pointer-events-none');
    }

    let shortName = symbol.includes('-') ? symbol.split(':')[1].split('-')[0] : symbol;
    let typeClass = type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

    positionsContainerTable.innerHTML = `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
            <td class="p-2 md:p-3 font-bold text-slate-800">${shortName}</td>
            <td class="p-2 md:p-3"><span class="${typeClass} px-2 py-0.5 rounded text-xs font-bold">${type}</span></td>
            <td class="p-2 md:p-3 text-slate-700">${qty}</td>
            <td class="p-2 md:p-3 text-slate-700">₹${entryPrice.toFixed(2)}</td>
            <td class="p-2 md:p-3 font-medium text-slate-900" id="table-ltp">${currentLTP.toFixed(2)}</td>
            <td class="p-2 md:p-3 font-bold text-slate-400" id="table-pnl">₹0.00</td>
            <td class="p-2 md:p-3"><button onclick="closePosition()" class="border border-red-200 text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs transition font-semibold">Exit</button></td>
        </tr>
    `;

    updateOrderSideUI(); 
    updateFloatingPnLBox();
}

placeOrderBtn.addEventListener('click', async () => {
    let tpPrice = null; let slPrice = null;
    if (tpToggle.checked) tpPrice = parseFloat(tpInput.value);
    if (slToggle.checked) slPrice = parseFloat(slInput.value);

    if (currentPosition) {
        if (tpToggle.checked && (!tpPrice || tpPrice <= 0)) return alert("Kripya sahi Target price dalein.");
        if (slToggle.checked && (!slPrice || slPrice <= 0)) return alert("Kripya sahi Stop-Loss price dalein.");
        currentPosition.tp = tpPrice || null; currentPosition.sl = slPrice || null;
        drawOrderUI(currentPosition.type, currentPosition.qty, currentPosition.entryPrice, currentPosition.symbol, currentPosition.tp, currentPosition.sl);
        try { 
            await setDoc(doc(db, "portfolio", "myAccount"), { activePosition: currentPosition }, { merge: true });
            alert("✅ Target aur Stop Loss successfully update ho gaye!");
            closeOrderPanel(); // Close order window automatically after update
        } catch (e) {}
        return; 
    }

    const type = orderSideMode; 
    if (pendingOrder) return alert("Ek pending limit order pehle se hai, use cancel karein.");
    if (currentLTP === 0) return alert("Market data load ho raha hai, wait karein."); 
    
    const qty = parseInt(qtyInput.value) || 50;

    if (orderTypeMode === 'LIMIT') {
        const limitPrice = parseFloat(limitPriceInput.value);
        if (!limitPrice || limitPrice <= 0) return alert("Kripya sahi Limit Price dalein!");
        
        pendingOrder = { type: type, limitPrice: limitPrice, qty: qty, symbol: currentSymbol, tp: tpPrice, sl: slPrice };
        drawPendingOrderUI(pendingOrder);
        try { await setDoc(doc(db, "portfolio", "myAccount"), { pendingOrder: pendingOrder }, { merge: true }); } catch (e) {}
        limitPriceInput.value = '';
        closeOrderPanel();
        return; 
    }

    currentPosition = { type: type, entryPrice: currentLTP, qty: qty, symbol: currentSymbol, tp: tpPrice, sl: slPrice };
    drawOrderUI(type, qty, currentLTP, currentSymbol, tpPrice, slPrice);
    try { await setDoc(doc(db, "portfolio", "myAccount"), { activePosition: currentPosition }, { merge: true }); } catch (e) {}
    
    closeOrderPanel(); // Order lagte hi panel band kar do
    if (!isDrawerOpen) drawerToggle.click(); // Aur positions wala drawer khol do
});

window.closePosition = async function() {
    if (!currentPosition) return;
    
    let realizedPnL = currentPosition.type === 'BUY' 
        ? (currentLTP - currentPosition.entryPrice) * currentPosition.qty 
        : (currentPosition.entryPrice - currentLTP) * currentPosition.qty;

    walletBalance += realizedPnL;
    walletDisplay.innerText = `₹${walletBalance.toFixed(2)}`;
    
    const tradeRecord = {
        symbol: currentPosition.symbol, type: currentPosition.type, qty: currentPosition.qty,
        entryPrice: currentPosition.entryPrice, exitPrice: currentLTP, realizedPnL: realizedPnL, time: new Date().toLocaleString()
    };

    if (entryPriceLine) { candleSeries.removePriceLine(entryPriceLine); entryPriceLine = null; }
    if (tpLine) { candleSeries.removePriceLine(tpLine); tpLine = null; }
    if (slLine) { candleSeries.removePriceLine(slLine); slLine = null; }
    
    currentPosition = null;
    drawerPnlDisplay.innerText = "₹0.00";
    drawerPnlDisplay.className = "text-[10px] md:text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200";
    positionsContainerTable.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-slate-400">No active positions</td></tr>`;
    
    updateFloatingPnLBox(); 
    
    tpToggle.checked = false; tpToggle.dispatchEvent(new Event('change'));
    slToggle.checked = false; slToggle.dispatchEvent(new Event('change'));

    updateOrderSideUI(); 

    try {
        await setDoc(doc(db, "portfolio", "myAccount"), {
            activePosition: null, walletBalance: walletBalance, tradeHistory: arrayUnion(tradeRecord) 
        }, { merge: true });
        if(!document.getElementById('history-table').classList.contains('hidden')) loadHistory();
    } catch (e) {}
};

async function loadHistory() {
    const historyTableBody = document.getElementById('history-table-body');
    historyTableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-slate-500">Loading trades...</td></tr>`;
    try {
        const docSnap = await getDoc(doc(db, "portfolio", "myAccount"));
        if (docSnap.exists() && docSnap.data().tradeHistory) {
            const history = docSnap.data().tradeHistory;
            historyTableBody.innerHTML = ""; 
            history.slice().reverse().forEach(trade => {
                const pnlColor = trade.realizedPnL >= 0 ? 'text-green-600' : 'text-red-500';
                const typeClass = trade.type === 'BUY' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
                const shortSymbol = trade.symbol.includes(':') ? trade.symbol.split(':')[1].split('-')[0] : trade.symbol;

                historyTableBody.innerHTML += `
                    <tr class="border-b border-slate-100 hover:bg-slate-50">
                        <td class="p-2 md:p-3 text-slate-500">${trade.time}</td>
                        <td class="p-2 md:p-3 font-bold text-slate-800">${shortSymbol}</td>
                        <td class="p-2 md:p-3"><span class="${typeClass} px-2 py-0.5 rounded text-xs font-bold">${trade.type}</span></td>
                        <td class="p-2 md:p-3 text-slate-600">${trade.qty}</td>
                        <td class="p-2 md:p-3 text-slate-600">₹${trade.entryPrice.toFixed(2)}</td>
                        <td class="p-2 md:p-3 text-slate-600">₹${trade.exitPrice.toFixed(2)}</td>
                        <td class="p-2 md:p-3 font-bold ${pnlColor}">₹${trade.realizedPnL.toFixed(2)}</td>
                    </tr>
                `;
            });
            if(history.length === 0) historyTableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-slate-400">No past trades found.</td></tr>`;
        } else { historyTableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-slate-400">No past trades found.</td></tr>`; }
    } catch(e) {}
}

socket.on('market-tick', async (serverLTP) => {
    currentLTP = serverLTP;
    ltpDisplay.innerText = currentLTP.toFixed(2);
    
    if (lastCandle) {
        const currentUnixTime = Math.floor(Date.now() / 1000);
        const currentMinute = currentUnixTime - (currentUnixTime % 60);

        if (currentMinute > lastCandle.time) {
            lastCandle = { time: currentMinute, open: currentLTP, high: currentLTP, low: currentLTP, close: currentLTP };
        } else {
            lastCandle.close = currentLTP;
            if (currentLTP > lastCandle.high) lastCandle.high = currentLTP;
            if (currentLTP < lastCandle.low) lastCandle.low = currentLTP;
        }
        candleSeries.update(lastCandle);
    }

    if (pendingOrder) {
        let isTriggered = false;
        if (pendingOrder.type === 'BUY' && currentLTP <= pendingOrder.limitPrice) { isTriggered = true; } 
        else if (pendingOrder.type === 'SELL' && currentLTP >= pendingOrder.limitPrice) { isTriggered = true; }

        if (isTriggered) {
            currentPosition = { 
                type: pendingOrder.type, entryPrice: pendingOrder.limitPrice, 
                qty: pendingOrder.qty, symbol: pendingOrder.symbol, 
                tp: pendingOrder.tp, sl: pendingOrder.sl 
            };
            if (pendingLimitLine) { candleSeries.removePriceLine(pendingLimitLine); pendingLimitLine = null; }
            pendingOrder = null;

            drawOrderUI(currentPosition.type, currentPosition.qty, currentPosition.entryPrice, currentPosition.symbol, currentPosition.tp, currentPosition.sl);
            alert("🎯 Limit Order Executed!");

            try { await setDoc(doc(db, "portfolio", "myAccount"), { pendingOrder: null, activePosition: currentPosition }, { merge: true });
            } catch (e) {}
        }
    }

    if (currentPosition) {
        let pnl = currentPosition.type === 'BUY' 
            ? (currentLTP - currentPosition.entryPrice) * currentPosition.qty 
            : (currentPosition.entryPrice - currentLTP) * currentPosition.qty;

        drawerPnlDisplay.innerText = `₹${pnl.toFixed(2)}`;
        drawerPnlDisplay.className = pnl >= 0 ? "text-[10px] md:text-xs font-bold px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200" : "text-[10px] md:text-xs font-bold px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200";

        const tableLTP = document.getElementById('table-ltp');
        const tablePnL = document.getElementById('table-pnl');
        if(tableLTP) tableLTP.innerText = currentLTP.toFixed(2);
        if(tablePnL) {
            tablePnL.innerText = `₹${pnl.toFixed(2)}`;
            tablePnL.className = pnl >= 0 ? "p-2 md:p-3 font-bold text-green-600" : "p-2 md:p-3 font-bold text-red-500";
        }

        updateFloatingPnLBox();

        if (currentPosition.type === 'BUY') {
            if (currentPosition.tp && currentLTP >= currentPosition.tp) { alert(`🎯 Target Hit! PnL: ₹${pnl.toFixed(2)}`); closePosition(); } 
            else if (currentPosition.sl && currentLTP <= currentPosition.sl) { alert(`🛑 Stop Loss Hit! PnL: ₹${pnl.toFixed(2)}`); closePosition(); }
        } else if (currentPosition.type === 'SELL') {
            if (currentPosition.tp && currentLTP <= currentPosition.tp) { alert(`🎯 Target Hit! PnL: ₹${pnl.toFixed(2)}`); closePosition(); } 
            else if (currentPosition.sl && currentLTP >= currentPosition.sl) { alert(`🛑 Stop Loss Hit! PnL: ₹${pnl.toFixed(2)}`); closePosition(); }
        }
    }
});