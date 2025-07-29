
// Customer Care Application with JSON Data Loading
let whisperModule = null;
let isListening = false;
let lastRecognizedCommand = '';
let debugLog = [];
let currentInterimText = '';
let customerData = null;
let ordersData = null;
let returnsData = null;
let lastUnrecognizedCommand = '';
let isSpeechEnabled = true; // New variable to control speech output

function addDebugLog(message, type = 'INFO') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] [${type}] ${message}`;
    debugLog.push(logEntry);
    console.log(logEntry);
    
    // Keep only last 50 log entries
    if (debugLog.length > 50) {
        debugLog.shift();
    }
    
    updateDebugUI();
}

// Voice transcript functionality
let voiceTranscript = [];

function addVoiceTranscript(text, isInterim = false) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
        text: text,
        timestamp: timestamp,
        isInterim: isInterim
    };
    
    if (isInterim) {
        // Update the last entry if it's interim, otherwise add new
        if (voiceTranscript.length > 0 && voiceTranscript[voiceTranscript.length - 1].isInterim) {
            voiceTranscript[voiceTranscript.length - 1] = entry;
        } else {
            voiceTranscript.push(entry);
        }
    } else {
        // Remove any interim entries and add final
        voiceTranscript = voiceTranscript.filter(entry => !entry.isInterim);
        voiceTranscript.push(entry);
    }
    
    // Keep only last 20 transcript entries
    if (voiceTranscript.length > 20) {
        voiceTranscript = voiceTranscript.slice(-20);
    }
    
    updateVoiceTranscriptUI();
}

function updateVoiceTranscriptUI() {
    const transcriptElement = document.getElementById('voice-transcript');
    if (transcriptElement) {
        transcriptElement.innerHTML = voiceTranscript.map(entry => {
            const entryClass = entry.isInterim ? 'voice-transcript-interim' : 'voice-transcript-text';
            return `<div class="voice-transcript-entry">
                <span class="voice-transcript-timestamp">${entry.timestamp}</span>
                <span class="${entryClass}">${entry.text}</span>
            </div>`;
        }).join('');
        
        // Scroll to bottom
        transcriptElement.scrollTop = transcriptElement.scrollHeight;
    }
}

function clearVoiceTranscript() {
    voiceTranscript = [];
    updateVoiceTranscriptUI();
    addDebugLog('Voice transcript cleared', 'INFO');
}

function updateDebugUI() {
    const debugElement = document.getElementById('debugLog');
    if (debugElement) {
        debugElement.innerHTML = debugLog.slice(-10).map(log => 
            `<div style="font-size: 11px; margin: 2px 0; font-family: monospace;">${log}</div>`
        ).join('');
    }
}

// Data Loading Functions
async function loadCustomerData() {
    try {
        addDebugLog('Loading customer data...', 'DEBUG');
        const response = await fetch('../src/customer-care/data/orders.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        customerData = data.customer;
        ordersData = data.orders;
        addDebugLog('Customer data loaded successfully', 'INFO');
        return data;
    } catch (error) {
        addDebugLog(`Failed to load customer data: ${error.message}`, 'ERROR');
        console.error('Error loading customer data:', error);
        return null;
    }
}

async function loadReturnsData() {
    try {
        addDebugLog('Loading returns data...', 'DEBUG');
        const response = await fetch('../src/customer-care/data/returns.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        returnsData = data;
        addDebugLog('Returns data loaded successfully', 'INFO');
        return data;
    } catch (error) {
        addDebugLog(`Failed to load returns data: ${error.message}`, 'ERROR');
        console.error('Error loading returns data:', error);
        return null;
    }
}

// UI Rendering Functions
function renderCustomerInfo() {
    if (!customerData) return;
    
    const customerInfoHtml = `
        <div class="customer-info">
            <h3>👤 Customer Information</h3>
            <div class="customer-details">
                <div class="customer-detail">
                    <label>Name</label>
                    <span>${customerData.name}</span>
                </div>
                <div class="customer-detail">
                    <label>Email</label>
                    <span>${customerData.email}</span>
                </div>
                <div class="customer-detail">
                    <label>Phone</label>
                    <span>${customerData.phone}</span>
                </div>
                <div class="customer-detail">
                    <label>Customer ID</label>
                    <span>${customerData.id}</span>
                </div>
            </div>
        </div>
    `;
    
    // Insert customer info at the top of each section
    document.querySelectorAll('.section').forEach(section => {
        if (!section.querySelector('.customer-info')) {
            section.insertAdjacentHTML('afterbegin', customerInfoHtml);
        }
    });
}

function renderOrderHistory() {
    if (!ordersData) return;
    
    const orderHistoryHtml = `
        <div class="order-history">
            <h3>📦 Order History</h3>
            ${ordersData.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-id">${order.orderId}</div>
                            <div class="order-date">${new Date(order.orderDate).toLocaleDateString()}</div>
                        </div>
                        <div class="order-status ${order.status}">${order.status}</div>
                    </div>
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <img src="${item.image}" alt="${item.name}" onerror="this.src='../src/customer-care/placeholder.png'">
                                <div class="order-item-details">
                                    <div class="order-item-name">${item.name}</div>
                                    <div class="order-item-meta">
                                        ${item.brand ? `Brand: ${item.brand}` : ''}
                                        ${item.size ? `Size: ${item.size}` : ''}
                                        ${item.color ? `Color: ${item.color}` : ''}
                                        Qty: ${item.quantity}
                                    </div>
                                </div>
                                <div class="order-item-price">$${item.price.toFixed(2)}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-footer">
                        <div class="order-total">Total: $${order.totalAmount.toFixed(2)}</div>
                        <div class="order-actions">
                            <button class="btn btn-secondary" onclick="selectOrderForReturn('${order.orderId}')">Return Items</button>
                            <button class="btn btn-secondary" onclick="viewOrderDetails('${order.orderId}')">View Details</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Add order history to returns section
    const returnsSection = document.getElementById('returns');
    if (returnsSection && !returnsSection.querySelector('.order-history')) {
        const formContainer = returnsSection.querySelector('.form-container');
        formContainer.insertAdjacentHTML('beforebegin', orderHistoryHtml);
    }
}

function renderReturnsHistory() {
    if (!returnsData) return;
    
    const returnsHistoryHtml = `
        <div class="returns-history">
            <h3>🔄 Returns & Replacements History</h3>
            ${returnsData.returns.map(returnItem => `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-id">${returnItem.returnId}</div>
                            <div class="order-date">${new Date(returnItem.requestDate).toLocaleDateString()}</div>
                        </div>
                        <div class="order-status ${returnItem.status}">${returnItem.status}</div>
                    </div>
                    <div class="order-items">
                        ${returnItem.items.map(item => `
                            <div class="order-item">
                                <div class="order-item-details">
                                    <div class="order-item-name">${item.name}</div>
                                    <div class="order-item-meta">
                                        ${item.size ? `Size: ${item.size}` : ''}
                                        ${item.color ? `Color: ${item.color}` : ''}
                                        Qty: ${item.quantity}
                                    </div>
                                </div>
                                <div class="order-item-price">$${item.price.toFixed(2)}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-footer">
                        <div class="order-total">
                            ${returnItem.type === 'return' ? `Refund: $${returnItem.refundAmount.toFixed(2)}` : 'Replacement Requested'}
                        </div>
                        <div class="order-actions">
                            <button class="btn btn-secondary" onclick="trackReturn('${returnItem.returnId}')">Track Status</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Add returns history to tracking section
    const trackingSection = document.getElementById('tracking');
    if (trackingSection && !trackingSection.querySelector('.returns-history')) {
        const trackingContainer = trackingSection.querySelector('.tracking-container');
        trackingContainer.insertAdjacentHTML('beforeend', returnsHistoryHtml);
    }
}

function populateReturnForm() {
    if (!ordersData) return;
    
    const itemList = document.querySelector('.item-list');
    if (itemList) {
        // Get the most recent delivered order
        const recentOrder = ordersData.find(order => order.status === 'delivered');
        if (recentOrder) {
            itemList.innerHTML = recentOrder.items.map(item => `
                <div class="item-checkbox">
                    <input type="checkbox" id="${item.itemId}" name="items[]" value="${item.itemId}">
                    <label for="${item.itemId}">
                        <div class="item-details">
                            <div class="item-name">${item.name}</div>
                            <div class="item-meta">
                                ${item.brand ? `Brand: ${item.brand}` : ''}
                                ${item.size ? `Size: ${item.size}` : ''}
                                ${item.color ? `Color: ${item.color}` : ''}
                            </div>
                        </div>
                        <div class="item-price">$${item.price.toFixed(2)}</div>
                    </label>
                </div>
            `).join('');
        }
    }
}

function populateReturnReasons() {
    if (!returnsData) return;
    
    const returnReasonSelect = document.getElementById('returnReason');
    if (returnReasonSelect) {
        returnReasonSelect.innerHTML = '<option value="">Select a reason</option>' +
            returnsData.returnReasons.map(reason => 
                `<option value="${reason.id}">${reason.name}</option>`
            ).join('');
    }
    
    const defectTypeSelect = document.getElementById('defectType');
    if (defectTypeSelect) {
        defectTypeSelect.innerHTML = '<option value="">Select defect type</option>' +
            returnsData.defectTypes.map(defect => 
                `<option value="${defect.id}">${defect.name}</option>`
            ).join('');
    }
}

// Event Handlers
function selectOrderForReturn(orderId) {
    addDebugLog(`Selecting order ${orderId} for return`, 'ACTION');
    const order = ordersData.find(o => o.orderId === orderId);
    if (order) {
        // Navigate to returns section
        document.querySelector('a[href="#returns"]').click();
        
        // Pre-fill order number
        const orderNumberInput = document.getElementById('orderNumber');
        if (orderNumberInput) {
            orderNumberInput.value = orderId;
        }
        
        // Update item list for this order
        const itemList = document.querySelector('.item-list');
        if (itemList) {
            itemList.innerHTML = order.items.map(item => `
                <div class="item-checkbox">
                    <input type="checkbox" id="${item.itemId}" name="items[]" value="${item.itemId}">
                    <label for="${item.itemId}">
                        <div class="item-details">
                            <div class="item-name">${item.name}</div>
                            <div class="item-meta">
                                ${item.brand ? `Brand: ${item.brand}` : ''}
                                ${item.size ? `Size: ${item.size}` : ''}
                                ${item.color ? `Color: ${item.color}` : ''}
                            </div>
                        </div>
                        <div class="item-price">$${item.price.toFixed(2)}</div>
                    </label>
                </div>
            `).join('');
        }
        
        speak(`Selected order ${orderId} for return. You can now choose which items to return.`);
    }
}

function trackReturn(returnId) {
    addDebugLog(`Tracking return ${returnId}`, 'ACTION');
    const returnItem = returnsData.returns.find(r => r.returnId === returnId);
    if (returnItem) {
        // Navigate to tracking section
        document.querySelector('a[href="#tracking"]').click();
        
        // Pre-fill tracking number
        const trackingInput = document.getElementById('trackingNumber');
        if (trackingInput) {
            trackingInput.value = returnId;
        }
        
        // Show tracking results
        showTrackingResults(returnItem);
        
        speak(`Showing tracking information for return ${returnId}`);
    }
}

function showTrackingResults(returnItem) {
    const trackingResults = document.getElementById('trackingResults');
    if (trackingResults) {
        trackingResults.style.display = 'block';
        trackingResults.innerHTML = `
            <div class="status-card">
                <h3>${returnItem.returnId}</h3>
                <div class="status-timeline">
                    ${returnItem.timeline.map((step, index) => `
                        <div class="status-step ${index < returnItem.timeline.length - 1 ? 'completed' : 'active'}">
                            <div class="step-icon">${index < returnItem.timeline.length - 1 ? '✓' : '📦'}</div>
                            <div class="step-content">
                                <h4>${step.description}</h4>
                                <p>${new Date(step.date).toLocaleString()}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

function viewOrderDetails(orderId) {
    addDebugLog(`Viewing order details for ${orderId}`, 'ACTION');
    const order = ordersData.find(o => o.orderId === orderId);
    if (order) {
        const detailsHtml = `
            <div class="order-details-modal">
                <h3>Order Details - ${orderId}</h3>
                <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleString()}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
                <p><strong>Shipping Method:</strong> ${order.shipping.method}</p>
                <p><strong>Tracking Number:</strong> ${order.shipping.trackingNumber}</p>
                <p><strong>Payment Method:</strong> ${order.payment.method}</p>
            </div>
        `;
        
        // Show in a simple alert for now (could be enhanced with a modal)
        alert(`Order ${orderId}\nStatus: ${order.status}\nTotal: $${order.totalAmount.toFixed(2)}\nTracking: ${order.shipping.trackingNumber}`);
    }
}

// Voice Control Functions
async function loadWhisperModel() {
    addDebugLog('Starting to load Whisper WASM module...', 'DEBUG');
    try {
        whisperModule = await createWhisperModule({
            locateFile: (path) => {
                if (path.includes('models/')) {
                    return path.replace('models/', '../src/models/');
                }
                return path;
            }
        });
        addDebugLog('Whisper WASM module loaded successfully', 'INFO');
        
        document.addEventListener('whisperResult', (event) => {
            const result = event.detail;
            addDebugLog(`Transcription event received: ${JSON.stringify(result)}`, 'DEBUG');
            if (result && result.text) {
                if (result.isFinal) {
                    addDebugLog(`Final transcription result: "${result.text}"`, 'INFO');
                    addVoiceTranscript(result.text, false); // Add final transcript
                    handleVoiceCommand(result);
                    currentInterimText = '';
                } else {
                    addDebugLog(`Interim transcription: "${result.text}"`, 'DEBUG');
                    addVoiceTranscript(result.text, true); // Add interim transcript
                    currentInterimText = result.text;
                }
                updateUI();
            }
        });

        addDebugLog('Whisper Model Loaded and ready', 'INFO');
        updateUI();
    } catch (error) {
        addDebugLog(`Failed to load Whisper module: ${error.message}`, 'ERROR');
        console.error('[ERROR] Failed to load Whisper module:', error);
    }
}

function startListening() {
    if (!whisperModule) {
        addDebugLog('Whisper module not loaded - cannot start listening', 'ERROR');
        return;
    }

    addDebugLog('Starting voice recording...', 'DEBUG');
    whisperModule.startRecording().then(() => {
        isListening = true;
        addDebugLog('Voice recording started successfully', 'INFO');
        updateUI();
    }).catch(error => {
        addDebugLog(`Failed to start recording: ${error.message}`, 'ERROR');
        console.error('[ERROR] Failed to start recording:', error);
    });
}

function stopListening() {
    if (whisperModule && isListening) {
        addDebugLog('Stopping voice recording...', 'DEBUG');
        whisperModule.stopRecording();
        isListening = false;
        currentInterimText = '';
        addDebugLog('Voice recording stopped', 'INFO');
        updateUI();
    } else {
        addDebugLog('Cannot stop recording - not currently recording', 'WARN');
    }
}

// Dynamic Command Mapping System
let dynamicCommandMap = [];

function scanUIForActions() {
    dynamicCommandMap = [];
    // Buttons
    document.querySelectorAll('button, input[type="button"], input[type="submit"]').forEach(btn => {
        const label = (btn.innerText || btn.value || btn.getAttribute('aria-label') || '').trim();
        if (!label) return;
        const id = btn.id || '';
        // Generate command patterns
        [
            `click ${label.toLowerCase()}`,
            `press ${label.toLowerCase()}`,
            `${label.toLowerCase()}`
        ].forEach(pattern => {
            dynamicCommandMap.push({ pattern, action: () => btn.click(), type: 'button', label });
        });
        if (id) {
            dynamicCommandMap.push({ pattern: `click ${id.toLowerCase()}`, action: () => btn.click(), type: 'button', label });
        }
    });
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        const label = (link.innerText || '').trim();
        const href = link.getAttribute('href') || '';
        if (!label || !href) return;
        [
            `go to ${label.toLowerCase()}`,
            `open ${label.toLowerCase()}`,
            `show ${label.toLowerCase()}`,
            `${label.toLowerCase()}`
        ].forEach(pattern => {
            dynamicCommandMap.push({ pattern, action: () => link.click(), type: 'nav', label });
        });
    });
    // Form fields (for filling)
    document.querySelectorAll('input, textarea, select').forEach(field => {
        const label = (document.querySelector(`label[for="${field.id}"]`)?.innerText || field.placeholder || field.name || '').trim();
        if (!label) return;
        const id = field.id || field.name || '';
        // e.g., "fill order number 12345"
        dynamicCommandMap.push({
            pattern: new RegExp(`fill ${label.toLowerCase()} (.+)`),
            action: (val) => { field.value = val; field.dispatchEvent(new Event('input')); },
            type: 'field', label
        });
        if (id) {
            dynamicCommandMap.push({
                pattern: new RegExp(`fill ${id.toLowerCase()} (.+)`),
                action: (val) => { field.value = val; field.dispatchEvent(new Event('input')); },
                type: 'field', label
            });
        }
    });
}

function showDynamicCommands() {
    const debugPanel = document.getElementById('debug-panel');
    if (!debugPanel) return;
    debugPanel.innerHTML =
        '<ul>' +
        dynamicCommandMap.map(cmd => `<li>${typeof cmd.pattern === 'string' ? cmd.pattern : cmd.pattern.toString()}</li>`).join('') +
        '</ul>';
}

function handleVoiceCommand(result) {
    const { text, action, param } = typeof result === 'string' ? { text: result, action: '', param: '' } : result;
    addDebugLog(`Handling voice command: "${text}" (action: ${action})`, 'DEBUG');
    lastRecognizedCommand = text;
    updateUI();
    
    // Try dynamic command map first
    for (const cmd of dynamicCommandMap) {
        if (typeof cmd.pattern === 'string') {
            if (text.toLowerCase() === cmd.pattern) {
                addDebugLog(`Dynamic command matched: ${cmd.pattern}`, 'ACTION');
                cmd.action();
                lastUnrecognizedCommand = '';
                return;
            }
        } else if (cmd.pattern instanceof RegExp) {
            const match = text.toLowerCase().match(cmd.pattern);
            if (match) {
                addDebugLog(`Dynamic command matched: ${cmd.pattern}`, 'ACTION');
                cmd.action(match[1]);
                lastUnrecognizedCommand = '';
                return;
            }
        }
    }
    // Only respond if input is at least 2 words and not the same as last unrecognized
    if (text.trim().split(/\s+/).length >= 2 && text !== lastUnrecognizedCommand) {
        addDebugLog(`No section or command found for: "${text}"`, 'WARN');
        lastUnrecognizedCommand = text;
    }

    switch (action) {
        case 'navigate':
            navigateToSection(param);
            break;
        case 'submit_form':
        case 'submit_return':
            submitReturnForm();
            break;
        case 'submit_replacement':
            submitReplacementForm();
            break;
        case 'track_request':
            trackRequest();
            break;
        case 'scroll_down':
            addDebugLog('Executing: Scroll down action', 'ACTION');
            window.scrollBy(0, window.innerHeight / 2);
            speak('Scrolling down');
            break;
        case 'scroll_up':
            addDebugLog('Executing: Scroll up action', 'ACTION');
            window.scrollBy(0, -window.innerHeight / 2);
            speak('Scrolling up');
            break;
        case 'click':
            if (param) {
                addDebugLog(`Executing: Click action for text "${param}"`, 'ACTION');
                clickElementByText(param);
            } else {
                addDebugLog('Click command missing target text', 'WARN');
                speak('Please specify what to click');
            }
            break;
        case 'read_page': {
            const text = document.body.innerText.slice(0, 300);
            addDebugLog('Executing: Read page action', 'ACTION');
            speak(text);
            break;
        }
        case 'start_listening':
            addDebugLog('Executing: Start listening from voice command', 'ACTION');
            startListening();
            break;
        case 'stop_listening':
            addDebugLog('Executing: Stop listening from voice command', 'ACTION');
            stopListening();
            break;
        case 'call_support':
            addDebugLog('Executing: Call support action', 'ACTION');
            speak('Calling customer support at 1-800-SHOP-SMART');
            setTimeout(() => alert('Connecting to customer support...'), 1000);
            break;
        case 'live_chat':
            addDebugLog('Executing: Live chat action', 'ACTION');
            speak('Opening live chat');
            setTimeout(() => alert('Live chat window opening...'), 1000);
            break;
        case 'send_email':
            addDebugLog('Executing: Send email action', 'ACTION');
            speak('Opening email client');
            window.open('mailto:support@shopsmart.com', '_blank');
            break;
        case 'help':
            addDebugLog('Executing: Help action', 'ACTION');
            speak('I can help you navigate the customer care website. Try saying "go to returns" or "submit form"');
            break;
        case 'fill_field':
            if (param) {
                fillFormField(param);
            } else {
                addDebugLog('Fill field command missing parameters', 'WARN');
                speak('Please specify what field to fill');
            }
            break;
        case 'unknown':
            addDebugLog(`Command not recognized: "${text}"`, 'WARN');
            speak(`Command not recognized: ${text}. Try saying "help me" for assistance.`);
            break;
        default: {
            const lowerCommand = text.toLowerCase();
            if (lowerCommand.includes('scroll down')) {
                addDebugLog('Executing: Scroll down action (fallback)', 'ACTION');
                window.scrollBy(0, window.innerHeight / 2);
                speak('Scrolling down');
            } else if (lowerCommand.includes('scroll up')) {
                addDebugLog('Executing: Scroll up action (fallback)', 'ACTION');
                window.scrollBy(0, -window.innerHeight / 2);
                speak('Scrolling up');
            } else if (lowerCommand.includes('click')) {
                const targetText = text.replace('click', '').trim();
                addDebugLog(`Executing: Click action for text "${targetText}" (fallback)`, 'ACTION');
                clickElementByText(targetText);
            } else if (lowerCommand.includes('read')) {
                const pageText = document.body.innerText.slice(0, 300);
                addDebugLog('Executing: Read page action (fallback)', 'ACTION');
                speak(pageText);
            } else {
                addDebugLog(`Command not recognized: "${text}"`, 'WARN');
                speak(`Command not recognized: ${text}. Try saying "help me" for assistance.`);
            }
            break;
        }
    }
}

function navigateToSection(sectionName) {
    addDebugLog(`Navigating to section: ${sectionName}`, 'ACTION');
    if (!sectionName) {
        addDebugLog('No section name provided', 'WARN');
        speak('No section name provided');
        return;
    }
    // Map common voice command section names to actual section IDs
    const sectionMap = {
        'return': 'returns',
        'returns': 'returns',
        'replacement': 'replacements',
        'replacements': 'replacements',
        'track': 'tracking',
        'tracking': 'tracking',
        'status': 'tracking',
        'contact': 'contact',
        'support': 'contact',
        'help': 'contact',
        'home': 'returns',
    };
    const normalized = sectionName.trim().toLowerCase();
    const targetId = sectionMap[normalized] || sectionMap[normalized.replace(/s$/, '')] || normalized;
    // Find the nav link and click it
    const navLinks = document.querySelectorAll('.nav-link');
    let found = false;
    for (const link of navLinks) {
        const href = link.getAttribute('href').replace('#', '').toLowerCase();
        if (href === targetId) {
            link.click();
            speak(`Navigated to ${href} section`);
            found = true;
            break;
        }
    }
    if (!found) {
        addDebugLog(`Section ${sectionName} not found`, 'WARN');
        speak(`Section ${sectionName} not found`);
    }
}

function submitReturnForm() {
    addDebugLog('Executing: Submit return form action', 'ACTION');
    const returnForm = document.querySelector('.return-form');
    if (returnForm) {
        returnForm.dispatchEvent(new Event('submit'));
        speak('Return form submitted successfully');
    } else {
        addDebugLog('Return form not found', 'WARN');
        speak('Return form not found. Please navigate to the returns section first.');
    }
}

function submitReplacementForm() {
    addDebugLog('Executing: Submit replacement form action', 'ACTION');
    const replacementForm = document.querySelector('.replacement-form');
    if (replacementForm) {
        replacementForm.dispatchEvent(new Event('submit'));
        speak('Replacement form submitted successfully');
    } else {
        addDebugLog('Replacement form not found', 'WARN');
        speak('Replacement form not found. Please navigate to the replacements section first.');
    }
}

function trackRequest() {
    addDebugLog('Executing: Track request action', 'ACTION');
    const trackingInput = document.getElementById('trackingNumber');
    if (trackingInput && trackingInput.value) {
        if (typeof window.trackRequest === 'function') {
            window.trackRequest();
            speak('Tracking request submitted');
        } else {
            addDebugLog('Track request function not found', 'WARN');
            speak('Please enter a tracking number first');
        }
    } else {
        addDebugLog('Tracking number not entered', 'WARN');
        speak('Please enter a tracking number first');
    }
}

function fillFormField(param) {
    const [fieldName, value] = param.split(':');
    addDebugLog(`Filling field: ${fieldName} with value: ${value}`, 'ACTION');
    
    const field = document.getElementById(fieldName);
    if (field) {
        field.value = value;
        field.focus();
        speak(`Filled ${fieldName} with ${value}`);
    } else {
        addDebugLog(`Field ${fieldName} not found`, 'WARN');
        speak(`Field ${fieldName} not found`);
    }
}

function clickElementByText(text) {
    addDebugLog(`Attempting to click element with text: "${text}"`, 'DEBUG');
    const elements = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
    addDebugLog(`Found ${elements.length} clickable elements`, 'DEBUG');
    
    let clicked = false;
    elements.forEach((el, index) => {
        addDebugLog(`Checking element ${index + 1}: "${el.innerText}"`, 'DEBUG');
        if (el.innerText.toLowerCase().includes(text.toLowerCase())) {
            el.click();
            clicked = true;
            addDebugLog(`Clicked element: "${el.innerText}"`, 'INFO');
            console.log('[INFO] Clicked element:', el);
            speak(`Clicked ${el.innerText}`);
        }
    });
    
    if (!clicked) {
        addDebugLog(`No element found to click with text: "${text}"`, 'WARN');
        console.log('[WARN] No element found to click with text:', text);
        speak(`No element found with text: ${text}`);
    }
}

function speak(text) {
    addDebugLog(`Speaking text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, 'DEBUG');
    console.log('[DEBUG] Speaking text:', text);
    if (!isSpeechEnabled) {
        addDebugLog('Speech synthesis skipped due to disabled setting', 'DEBUG');
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => addDebugLog('Speech synthesis started', 'DEBUG');
    utterance.onend = () => addDebugLog('Speech synthesis ended', 'DEBUG');
    utterance.onerror = (event) => addDebugLog(`Speech synthesis error: ${event.error}`, 'ERROR');
    
    speechSynthesis.speak(utterance);
}

function updateUI() {
    const statusElement = document.getElementById('voice-status');
    const toggleButton = document.getElementById('voice-toggle-btn');
    const lastCommandElement = document.getElementById('last-command');
    const liveSpeechElement = document.getElementById('live-speech');
    
    if (statusElement) {
        if (isListening) {
            statusElement.textContent = 'Listening for "voice pilot"';
        } else {
            statusElement.textContent = 'Idle';
        }
    }
    
    if (toggleButton) {
        if (isListening) {
            toggleButton.textContent = 'Stop Listening';
            toggleButton.className = 'btn btn-danger';
        } else {
            toggleButton.textContent = 'Start Listening';
            toggleButton.className = 'btn btn-primary';
        }
    }
    
    if (lastCommandElement) {
        lastCommandElement.textContent = lastRecognizedCommand ? lastRecognizedCommand : '';
    }
    
    if (liveSpeechElement) {
        liveSpeechElement.textContent = currentInterimText ? currentInterimText : '';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    addDebugLog('DOM loaded, initializing application...', 'DEBUG');
    
    // Load data
    await loadCustomerData();
    await loadReturnsData();
    
    // Render UI components
    renderCustomerInfo();
    renderOrderHistory();
    renderReturnsHistory();
    populateReturnForm();
    populateReturnReasons();
    
    // Load voice module
    loadWhisperModel();

    scanUIForActions();
    showDynamicCommands();
    
    // Add UI elements if they don't exist
    if (!document.getElementById('voiceControls')) {
        const controls = document.createElement('div');
        controls.id = 'voiceControls';
        controls.innerHTML = `
            <div id="voice-control-panel" class="voice-panel">
                <div class="voice-panel-header" id="voice-panel-header">
                    <span>🎤 Voice Controls</span>
                    <button id="voice-panel-minimize" class="voice-panel-minimize" title="Minimize">_</button>
                </div>
                <div class="voice-panel-body" id="voice-panel-body">
                    <div>Status: <span id="voice-status">Idle</span></div>
                    <button id="voice-toggle-btn">Start Listening</button>
                    <button id="speech-toggle-btn" class="speech-toggle-btn">🔊 Speech: ON</button>
                    <div>Last Command: <span id="last-command"></span></div>
                    <div>Live Speech: <span id="live-speech"></span></div>
                    <div id="voice-commands-section" class="voice-commands-section">
                        <div class="voice-commands-title">Available Voice Commands</div>
                        <div id="debug-panel" class="voice-commands-list"></div>
                    </div>
                    <div id="voice-transcript-section" class="voice-transcript-section">
                        <div class="voice-transcript-header">
                            <div class="voice-transcript-title">Voice Transcript</div>
                            <button id="clear-transcript-btn" class="clear-transcript-btn" title="Clear transcript">🗑️</button>
                        </div>
                        <div id="voice-transcript" class="voice-transcript-content"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(controls);
        addDebugLog('Voice control UI initialized', 'INFO');
    }
    
    // Navigation functionality
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Form submission handlers
    document.querySelector('.return-form').addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Return request submitted successfully! You will receive a confirmation email shortly.');
    });

    document.querySelector('.replacement-form').addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Replacement request submitted successfully! Our team will review and contact you within 24 hours.');
    });

    // Add drag and minimize logic to the voice control panel
    const voicePanel = document.getElementById('voice-control-panel');
    const header = document.getElementById('voice-panel-header');
    const minimizeBtn = document.getElementById('voice-panel-minimize');
    const body = document.getElementById('voice-panel-body');
    
    // Add click handler for the voice toggle button
    const voiceToggleBtn = document.getElementById('voice-toggle-btn');
    if (voiceToggleBtn) {
        voiceToggleBtn.addEventListener('click', toggleListening);
    }

    // Add event listeners for wake word system
    document.addEventListener('wakeWordDetected', (event) => {
        addDebugLog(`Wake word "${event.detail.wakeWord}" detected! Listening for commands...`, 'INFO');
        speak(`Voice pilot activated. How can I help you?`);
        updateUI();
    });

    document.addEventListener('returnToWakeWord', (event) => {
        addDebugLog(`Returning to wake word mode. Say "${event.detail.wakeWord}" to activate.`, 'INFO');
        updateUI();
    });

    // Add click handler for the speech toggle button
    const speechToggleBtn = document.getElementById('speech-toggle-btn');
    if (speechToggleBtn) {
        speechToggleBtn.addEventListener('click', toggleSpeech);
    }

    // Add click handler for the clear transcript button
    const clearTranscriptBtn = document.getElementById('clear-transcript-btn');
    if (clearTranscriptBtn) {
        clearTranscriptBtn.addEventListener('click', clearVoiceTranscript);
    }

    // Drag logic
    let isDragging = false, offsetX = 0, offsetY = 0;
    header.style.cursor = 'move';
    header.onmousedown = function(e) {
      isDragging = true;
      offsetX = e.clientX - voicePanel.offsetLeft;
      offsetY = e.clientY - voicePanel.offsetTop;
      document.body.style.userSelect = 'none';
    };
    document.onmousemove = function(e) {
      if (isDragging) {
        voicePanel.style.left = (e.clientX - offsetX) + 'px';
        voicePanel.style.top = (e.clientY - offsetY) + 'px';
        voicePanel.style.right = 'auto';
        voicePanel.style.bottom = 'auto';
      }
    };
    document.onmouseup = function() {
      isDragging = false;
      document.body.style.userSelect = '';
    };
    // Minimize/maximize logic
    minimizeBtn.onclick = function() {
      if (body.style.display !== 'none') {
        body.style.display = 'none';
        minimizeBtn.textContent = '▢';
        minimizeBtn.title = 'Maximize';
      } else {
        body.style.display = '';
        minimizeBtn.textContent = '_';
        minimizeBtn.title = 'Minimize';
      }
    };
});

function toggleListening() {
    addDebugLog(`Toggle listening called - current state: ${isListening}`, 'DEBUG');
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function toggleSpeech() {
    addDebugLog(`Toggle speech called - current state: ${isSpeechEnabled}`, 'DEBUG');
    isSpeechEnabled = !isSpeechEnabled;
    const speechToggleBtn = document.getElementById('speech-toggle-btn');
    if (speechToggleBtn) {
        speechToggleBtn.textContent = `🔊 Speech: ${isSpeechEnabled ? 'ON' : 'OFF'}`;
        speechToggleBtn.className = isSpeechEnabled ? 'speech-toggle-btn' : 'speech-toggle-btn off';
        addDebugLog(`Speech output is now ${isSpeechEnabled ? 'enabled' : 'disabled'}`, 'INFO');
    }
}

function trackRequest() {
    const trackingNumber = document.getElementById('trackingNumber').value;
    if (trackingNumber) {
        document.getElementById('trackingResults').style.display = 'block';
    } else {
        alert('Please enter a tracking number.');
    }
}

// Global functions for UI
window.toggleListening = toggleListening;
window.trackRequest = trackRequest;
window.selectOrderForReturn = selectOrderForReturn;
window.trackReturn = trackReturn;
window.viewOrderDetails = viewOrderDetails;
