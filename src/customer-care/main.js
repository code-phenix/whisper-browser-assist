// Customer Care Application with Voice Transcription and Llama DSL
let whisperModule = null;
let isListening = false;
let lastRecognizedCommand = '';
let debugLog = [];
let currentInterimText = '';
let customerData = null;
let ordersData = null;
let returnsData = null;
let lastUnrecognizedCommand = '';
let isSpeechEnabled = true;
// Make speech setting globally accessible
window.isSpeechEnabled = isSpeechEnabled;

// Llama and DSL components
let llamaIntegration = null;
let dslExecutor = null;

// Voice transcript functionality
let voiceTranscript = [];
let updateTranscriptTimeout = null;

// DSL tracking
let dslCommands = [];
let dslCommandsTimeout = null;

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

// Make debug function globally accessible
window.addDebugLog = addDebugLog;

// Make progress functions globally accessible
window.updateWhisperProgress = updateWhisperProgress;
window.updateLlamaProgress = updateLlamaProgress;

// Voice transcript functionality
function addVoiceTranscript(text, isInterim = false) {
    const timestamp = new Date().toLocaleTimeString();
    
    if (isInterim) {
        // Update existing interim entry or create new one
        const existingInterim = voiceTranscript.find(entry => entry.isInterim);
        if (existingInterim) {
            existingInterim.text = text;
            existingInterim.timestamp = timestamp;
        } else {
            voiceTranscript.push({
                text: text,
                timestamp: timestamp,
                isInterim: true
            });
        }
    } else {
        // Remove any interim entries and add final entry
        voiceTranscript = voiceTranscript.filter(entry => !entry.isInterim);
        voiceTranscript.push({
            text: text,
            timestamp: timestamp,
            isInterim: false
        });
    }
    
    // Keep only last 20 entries
    if (voiceTranscript.length > 20) {
        voiceTranscript = voiceTranscript.slice(-20);
    }
    
        updateVoiceTranscriptUI();
}

function updateVoiceTranscriptUI() {
    const transcriptElement = document.getElementById('voice-transcript');
    if (!transcriptElement) return;
    
    transcriptElement.innerHTML = '';
    
    voiceTranscript.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = `transcript-entry ${entry.isInterim ? 'interim' : 'final'}`;
        entryDiv.innerHTML = `
            <span class="transcript-time">${entry.timestamp}</span>
            <span class="transcript-text">${entry.text}</span>
        `;
        transcriptElement.appendChild(entryDiv);
    });
    
    // Scroll to bottom
    transcriptElement.scrollTop = transcriptElement.scrollHeight;
}

function clearVoiceTranscript() {
    voiceTranscript = [];
    updateVoiceTranscriptUI();
}

function updateDebugUI() {
    const debugPanel = document.getElementById('debug-panel');
    if (!debugPanel) return;
    
    debugPanel.innerHTML = '';
    
    // Show last 10 debug entries
    const recentLogs = debugLog.slice(-10);
    recentLogs.forEach(log => {
        const logDiv = document.createElement('div');
        logDiv.className = 'debug-entry';
        logDiv.textContent = log;
        debugPanel.appendChild(logDiv);
    });
}

// Data loading functions
async function loadCustomerData() {
    try {
        const response = await fetch('../src/customer-care/data/orders.json');
        customerData = await response.json();
        addDebugLog('✅ Customer data loaded successfully', 'INFO');
    } catch (error) {
        addDebugLog(`❌ Failed to load customer data: ${error.message}`, 'ERROR');
    }
}

async function loadReturnsData() {
    try {
        const response = await fetch('../src/customer-care/data/returns.json');
        returnsData = await response.json();
        addDebugLog('✅ Returns data loaded successfully', 'INFO');
    } catch (error) {
        addDebugLog(`❌ Failed to load returns data: ${error.message}`, 'ERROR');
    }
}

// Whisper model loading with progress
async function loadWhisperModelWithProgress() {
    try {
        addDebugLog('🔄 Loading Whisper model...', 'INFO');
        updateWhisperProgress(20, 'Checking browser support...');
        
        // Debug: Check what's available globally
        addDebugLog(`🔍 Global objects check:`, 'DEBUG');
        addDebugLog(`- window.createWhisperModule: ${typeof window.createWhisperModule}`, 'DEBUG');
        addDebugLog(`- window.WhisperModule: ${typeof window.WhisperModule}`, 'DEBUG');
        addDebugLog(`- window.SpeechRecognition: ${typeof window.SpeechRecognition}`, 'DEBUG');
        addDebugLog(`- window.webkitSpeechRecognition: ${typeof window.webkitSpeechRecognition}`, 'DEBUG');
        
        updateWhisperProgress(40, 'Initializing Whisper module...');
        
        // Check if createWhisperModule is available globally
        if (typeof window.createWhisperModule === 'function') {
            addDebugLog('✅ createWhisperModule function found', 'INFO');
            updateWhisperProgress(60, 'Creating Whisper module...');
            
            whisperModule = await window.createWhisperModule();
            
            updateWhisperProgress(80, 'Testing microphone...');
            
            // Test microphone functionality
            if (whisperModule && typeof whisperModule.checkMicrophoneStatus === 'function') {
                const micStatus = await whisperModule.checkMicrophoneStatus();
                if (micStatus.available) {
                    updateWhisperProgress(90, 'Microphone test passed...');
                } else {
                    updateWhisperProgress(90, 'Microphone not available...');
                }
            }
            
            addDebugLog('✅ Whisper model loaded successfully', 'INFO');
            return true;
        } else {
            addDebugLog('❌ createWhisperModule function not available', 'ERROR');
            addDebugLog('🔍 Available global functions:', 'DEBUG');
            Object.keys(window).forEach(key => {
                if (typeof window[key] === 'function' && key.toLowerCase().includes('whisper')) {
                    addDebugLog(`- ${key}: ${typeof window[key]}`, 'DEBUG');
                }
            });
            return false;
        }
    } catch (error) {
        addDebugLog(`❌ Error loading Whisper model: ${error.message}`, 'ERROR');
        addDebugLog(`❌ Error stack: ${error.stack}`, 'ERROR');
        return false;
    }
}

// Original function for backward compatibility
async function loadWhisperModel() {
    return await loadWhisperModelWithProgress();
}

// Voice recognition functions
async function startListening() {
    if (!whisperModule) {
        addDebugLog('❌ Whisper module not loaded', 'ERROR');
        return false;
    }
    
    try {
        addDebugLog('🎤 Starting voice recognition...', 'INFO');
        
        // Check if there's a state mismatch and reset if needed
        if (whisperModule.getStatus) {
            const status = whisperModule.getStatus();
            if (status.isRecording && !status.isLiveTranscribing) {
                addDebugLog('⚠️ State mismatch detected, resetting WhisperModule...', 'WARN');
                whisperModule.resetState();
            }
        }
        
        // Use the WhisperModule's speech recognition
        await whisperModule.startRecording();
        
        // Set up event listeners for the WhisperModule
        if (whisperModule.speechRecognition) {
            whisperModule.speechRecognition.onstart = () => {
                isListening = true;
                addDebugLog('✅ Voice recognition started', 'INFO');
                updateUI();
            };
            
            whisperModule.speechRecognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                if (finalTranscript) {
                    addVoiceTranscript(finalTranscript, false);
                    handleVoiceCommand(finalTranscript);
                    lastRecognizedCommand = finalTranscript;
                    document.getElementById('last-command').textContent = finalTranscript;
                }
                
                if (interimTranscript) {
                    addVoiceTranscript(interimTranscript, true);
                    document.getElementById('live-speech').textContent = interimTranscript;
                }
            };
            
            whisperModule.speechRecognition.onerror = (event) => {
                addDebugLog(`❌ Recognition error: ${event.error}`, 'ERROR');
                isListening = false;
                updateUI();
            };
            
            whisperModule.speechRecognition.onend = () => {
                isListening = false;
                addDebugLog('🛑 Voice recognition stopped', 'INFO');
        updateUI();
            };
        }
        
        return true;
        
    } catch (error) {
        addDebugLog(`❌ Error starting recognition: ${error.message}`, 'ERROR');
        return false;
    }
}

async function stopListening() {
    if (whisperModule) {
        await whisperModule.stopRecording();
    }
        isListening = false;
    addDebugLog('🛑 Stopping voice recognition', 'INFO');
        updateUI();
}

// Advanced voice command handling with Llama DSL conversion
async function handleVoiceCommand(text) {
    const command = text.toLowerCase().trim();
    addDebugLog(`🎯 Processing command: "${command}"`, 'INFO');
    
    try {
        // Try to convert to DSL using Llama
        if (llamaIntegration && llamaIntegration.isLoaded) {
            addDebugLog(`🦙 Converting to DSL using TinyLlama...`, 'INFO');
            
            const dslCommand = await llamaIntegration.convertToDSL(text);
            addDebugLog(`✅ DSL Command: ${dslCommand}`, 'INFO');
            
            // Add to DSL commands list
            addDSLCommand(dslCommand, text);
            
            // Execute the DSL command
            if (dslExecutor) {
                const result = await dslExecutor.executeDSL(dslCommand);
                addDebugLog(`🔧 DSL Execution: ${result.success ? 'SUCCESS' : 'FAILED'}`, result.success ? 'INFO' : 'ERROR');
                
                if (result.success) {
                    speak(result.output);
                } else {
                    speak('I encountered an error processing that command');
                }
            } else {
                addDebugLog(`❌ DSL Executor not available`, 'ERROR');
                fallbackToBasicCommands(text);
            }
        } else {
            addDebugLog(`⚠️ Llama not loaded, using fallback commands`, 'WARN');
            fallbackToBasicCommands(text);
        }
    } catch (error) {
        addDebugLog(`❌ Error in voice command processing: ${error.message}`, 'ERROR');
        fallbackToBasicCommands(text);
    }
}

// Fallback to basic command handling
function fallbackToBasicCommands(text) {
    const command = text.toLowerCase().trim();
    
    if (command.includes('go to returns') || command.includes('open returns')) {
        navigateToSection('returns');
        speak('Navigating to returns section');
    } else if (command.includes('go to replacements') || command.includes('open replacements')) {
        navigateToSection('replacements');
        speak('Navigating to replacements section');
    } else if (command.includes('go to tracking') || command.includes('open tracking')) {
        navigateToSection('tracking');
        speak('Navigating to tracking section');
    } else if (command.includes('go to contact') || command.includes('open contact')) {
        navigateToSection('contact');
        speak('Navigating to contact section');
    } else if (command.includes('submit return') || command.includes('submit return form')) {
        submitReturnForm();
        speak('Submitting return form');
    } else if (command.includes('submit replacement') || command.includes('submit replacement form')) {
        submitReplacementForm();
        speak('Submitting replacement form');
    } else if (command.includes('track request') || command.includes('track my request')) {
        trackRequest();
        speak('Tracking your request');
    } else {
        addDebugLog(`❓ Unrecognized command: "${command}"`, 'WARN');
        speak('I did not understand that command. Please try again.');
    }
}

// UI navigation
function navigateToSection(sectionName) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionName}`) {
            link.classList.add('active');
        }
    });
    
    // Show target section
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');
}

// Form submission functions
function submitReturnForm() {
    const form = document.querySelector('.return-form');
    if (form) {
        form.dispatchEvent(new Event('submit'));
    }
}

function submitReplacementForm() {
    const form = document.querySelector('.replacement-form');
    if (form) {
        form.dispatchEvent(new Event('submit'));
    }
}

function trackRequest() {
    const trackingNumber = document.getElementById('trackingNumber');
    if (trackingNumber && trackingNumber.value) {
        document.getElementById('trackingResults').style.display = 'block';
        } else {
        alert('Please enter a tracking number.');
    }
}

// Speech synthesis
function speak(text) {
    if (!isSpeechEnabled) return;
    
    if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
        utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
    }
}

// UI update functions
async function updateMicrophoneStatus() {
    const micStatusElement = document.getElementById('mic-status');
    if (!micStatusElement) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        micStatusElement.textContent = 'Available';
        micStatusElement.className = 'status-ok';
    } catch (error) {
        micStatusElement.textContent = 'Not Available';
        micStatusElement.className = 'status-error';
        addDebugLog(`❌ Microphone not available: ${error.message}`, 'ERROR');
    }
}

function updateUI() {
    const voiceToggleBtn = document.getElementById('voice-toggle-btn');
    const voiceStatus = document.getElementById('voice-status');
    const forceRestartBtn = document.getElementById('force-restart-btn');
    const diagnoseBtn = document.getElementById('diagnose-btn');
    
    if (voiceToggleBtn) {
        voiceToggleBtn.textContent = isListening ? 'Stop Listening' : 'Start Listening';
        voiceToggleBtn.className = isListening ? 'btn-danger' : 'btn-primary';
    }
    
    if (voiceStatus) {
        voiceStatus.textContent = isListening ? 'Listening' : 'Idle';
        voiceStatus.className = isListening ? 'status-listening' : 'status-idle';
    }
    
    if (forceRestartBtn) {
        forceRestartBtn.style.display = isListening ? 'inline-block' : 'none';
    }
    
    if (diagnoseBtn) {
        diagnoseBtn.style.display = isListening ? 'inline-block' : 'none';
    }
}

// Event handlers
async function toggleListening() {
        if (isListening) {
        await stopListening();
        } else {
        await startListening();
    }
}

async function forceRestartRecognition() {
    addDebugLog('🔄 Force restarting recognition...', 'INFO');
    
    // Use WhisperModule's force restart if available
    if (whisperModule && typeof whisperModule.forceRestart === 'function') {
        whisperModule.forceRestart();
        addDebugLog('✅ WhisperModule force restart completed', 'INFO');
    }
    
    // Reset main application state
    isListening = false;
    
    // Wait a moment then restart
    setTimeout(async () => {
        await startListening();
    }, 1000);
}

async function diagnoseRecognition() {
    addDebugLog('🔍 Running recognition diagnostics...', 'INFO');
    
    // Check microphone
    await updateMicrophoneStatus();
    
    // Check whisper module
    if (!whisperModule) {
        addDebugLog('❌ Whisper module not loaded', 'ERROR');
    } else {
        addDebugLog('✅ Whisper module loaded', 'INFO');
        
        // Get detailed status
        if (whisperModule.getStatus) {
            const status = whisperModule.getStatus();
            addDebugLog(`🔍 WhisperModule Status:`, 'INFO');
            addDebugLog(`  - Initialized: ${status.isInitialized}`, 'INFO');
            addDebugLog(`  - Recording: ${status.isRecording}`, 'INFO');
            addDebugLog(`  - Live Transcribing: ${status.isLiveTranscribing}`, 'INFO');
            addDebugLog(`  - Audio Stream: ${status.hasAudioStream}`, 'INFO');
            addDebugLog(`  - Speech Recognition: ${status.hasSpeechRecognition}`, 'INFO');
        }
        
        // Use WhisperModule's diagnostic functions
        if (whisperModule.diagnoseRecognitionIssue) {
            const diagnosis = await whisperModule.diagnoseRecognitionIssue();
            addDebugLog(`🔍 Diagnosis: ${diagnosis.issue} - ${diagnosis.message}`, 'INFO');
        }
        
        if (whisperModule.checkMicrophoneStatus) {
            const micStatus = await whisperModule.checkMicrophoneStatus();
            addDebugLog(`🎤 Microphone status: ${micStatus.available ? 'Available' : 'Not available'}`, 'INFO');
        }
    }
    
    // Check speech synthesis
    if ('speechSynthesis' in window) {
        addDebugLog('✅ Speech synthesis available', 'INFO');
    } else {
        addDebugLog('❌ Speech synthesis not available', 'ERROR');
    }
}

function toggleSpeech() {
    isSpeechEnabled = !isSpeechEnabled;
    // Update global variable
    window.isSpeechEnabled = isSpeechEnabled;
    
    const speechToggleBtn = document.getElementById('speech-toggle-btn');
    if (speechToggleBtn) {
        speechToggleBtn.textContent = `🔊 Speech: ${isSpeechEnabled ? 'ON' : 'OFF'}`;
        speechToggleBtn.classList.toggle('off', !isSpeechEnabled);
    }
    
    // Stop any ongoing speech when turning off
    if (!isSpeechEnabled && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
    
    addDebugLog(`🔊 Speech ${isSpeechEnabled ? 'enabled' : 'disabled'}`, 'INFO');
}

// DSL command tracking functions
function addDSLCommand(dslCommand, originalText) {
    const timestamp = new Date().toLocaleTimeString();
    const commandEntry = {
        timestamp: timestamp,
        originalText: originalText,
        dslCommand: dslCommand,
        success: false
    };
    
    dslCommands.push(commandEntry);
    
    // Keep only last 20 commands
    if (dslCommands.length > 20) {
        dslCommands = dslCommands.slice(-20);
    }
    
        updateDSLCommandsUI();
}

function updateDSLCommandsUI() {
    const dslCommandsElement = document.getElementById('dsl-commands');
    if (!dslCommandsElement) return;
    
    dslCommandsElement.innerHTML = '';
    
    dslCommands.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'dsl-command-entry';
        entryDiv.innerHTML = `
            <div class="dsl-command-header">
                <span class="dsl-command-timestamp">${entry.timestamp}</span>
                <span class="dsl-command-action ${entry.success ? 'success' : 'error'}">${entry.success ? 'SUCCESS' : 'PENDING'}</span>
                    </div>
            <div class="dsl-command-content">
                <div class="dsl-command-text"><strong>Original:</strong> ${entry.originalText}</div>
                <div class="dsl-command-dsl"><strong>DSL:</strong> ${entry.dslCommand}</div>
            </div>
        `;
        dslCommandsElement.appendChild(entryDiv);
    });
    
    // Scroll to bottom
    dslCommandsElement.scrollTop = dslCommandsElement.scrollHeight;
}

function clearDSLCommands() {
    dslCommands = [];
    updateDSLCommandsUI();
}

// Initialize Llama and DSL components with progress
async function initializeLlamaAndDSLWithProgress() {
    try {
        addDebugLog('🦙 Initializing Llama integration...', 'INFO');
        updateLlamaProgress(20, 'Checking Llama integration...');
        
        // Initialize Llama integration
        if (typeof LlamaIntegration !== 'undefined') {
            updateLlamaProgress(40, 'Creating Llama integration...');
            llamaIntegration = new LlamaIntegration();
            
            updateLlamaProgress(60, 'Loading TinyLlama model...');
            await llamaIntegration.loadModel();
            addDebugLog('✅ Llama integration initialized', 'INFO');
            updateLlamaProgress(80, 'Llama model loaded...');
        } else {
            addDebugLog('❌ LlamaIntegration class not available', 'ERROR');
            updateLlamaProgress(80, 'Using mock Llama...');
        }
        
        // Initialize DSL executor
        updateLlamaProgress(90, 'Initializing DSL executor...');
        if (typeof DSLExecutor !== 'undefined') {
            dslExecutor = new DSLExecutor();
            addDebugLog('✅ DSL executor initialized', 'INFO');
            } else {
            addDebugLog('❌ DSLExecutor class not available', 'ERROR');
        }
        
    } catch (error) {
        addDebugLog(`❌ Error initializing Llama/DSL: ${error.message}`, 'ERROR');
    }
}

// Original function for backward compatibility
async function initializeLlamaAndDSL() {
    return await initializeLlamaAndDSLWithProgress();
}

// Model loading progress tracking
let whisperProgress = 0;
let llamaProgress = 0;
let overallProgress = 0;

// Update progress functions
function updateWhisperProgress(progress, status) {
    whisperProgress = progress;
    const progressBar = document.getElementById('whisper-progress');
    const statusElement = document.getElementById('whisper-status');
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    if (statusElement) {
        statusElement.textContent = status;
    }
    
    updateOverallProgress();
}

function updateLlamaProgress(progress, status) {
    llamaProgress = progress;
    const progressBar = document.getElementById('llama-progress');
    const statusElement = document.getElementById('llama-status');
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    if (statusElement) {
        statusElement.textContent = status;
    }
    
    updateOverallProgress();
}

function updateOverallProgress() {
    overallProgress = Math.round((whisperProgress + llamaProgress) / 2);
    const overallElement = document.getElementById('overall-progress-text');
    if (overallElement) {
        overallElement.textContent = `${overallProgress}%`;
    }
    
    // Hide loading overlay when both models are loaded
    if (whisperProgress >= 100 && llamaProgress >= 100) {
        setTimeout(() => {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
            }
        }, 1000); // Small delay to show 100% completion
    }
}

// Initialize application with model loading
async function initializeApp() {
    addDebugLog('🚀 Initializing Customer Care Application', 'INFO');
    
    // Start with loading progress
    updateWhisperProgress(0, 'Initializing...');
    updateLlamaProgress(0, 'Initializing...');
    
    // Load data
    await loadCustomerData();
    await loadReturnsData();
    
    // Load Whisper model with progress tracking
    updateWhisperProgress(10, 'Loading Whisper module...');
    const whisperLoaded = await loadWhisperModelWithProgress();
    if (!whisperLoaded) {
        addDebugLog('⚠️ Whisper module failed to load, using fallback speech recognition', 'WARN');
        updateWhisperProgress(100, 'Using fallback mode');
        setupFallbackSpeechRecognition();
    } else {
        updateWhisperProgress(100, 'Loaded successfully');
    }
    
    // Initialize Llama and DSL components with progress tracking
    updateLlamaProgress(10, 'Loading Llama integration...');
    await initializeLlamaAndDSLWithProgress();
    updateLlamaProgress(100, 'Loaded successfully');
    
    // Update microphone status
    await updateMicrophoneStatus();
    
    // Set up event listeners
    const voiceToggleBtn = document.getElementById('voice-toggle-btn');
    if (voiceToggleBtn) {
        voiceToggleBtn.addEventListener('click', toggleListening);
    }

    const forceRestartBtn = document.getElementById('force-restart-btn');
    if (forceRestartBtn) {
        forceRestartBtn.addEventListener('click', forceRestartRecognition);
    }
    
    const diagnoseBtn = document.getElementById('diagnose-btn');
    if (diagnoseBtn) {
        diagnoseBtn.addEventListener('click', diagnoseRecognition);
    }
    
    const speechToggleBtn = document.getElementById('speech-toggle-btn');
    if (speechToggleBtn) {
        speechToggleBtn.addEventListener('click', toggleSpeech);
    }

    const clearTranscriptBtn = document.getElementById('clear-transcript-btn');
    if (clearTranscriptBtn) {
        clearTranscriptBtn.addEventListener('click', clearVoiceTranscript);
    }

    const clearDSLBtn = document.getElementById('clear-dsl-btn');
    if (clearDSLBtn) {
        clearDSLBtn.addEventListener('click', clearDSLCommands);
    }

    // Voice panel minimize functionality
    const voicePanelHeader = document.getElementById('voice-panel-header');
    const voicePanelBody = document.getElementById('voice-panel-body');
    const minimizeBtn = document.getElementById('voice-panel-minimize');
    
    if (minimizeBtn && voicePanelBody) {
        minimizeBtn.addEventListener('click', () => {
            voicePanelBody.style.display = voicePanelBody.style.display === 'none' ? 'block' : 'none';
            minimizeBtn.textContent = voicePanelBody.style.display === 'none' ? '□' : '_';
        });
    }
    
    addDebugLog('✅ Application initialized successfully', 'INFO');
    updateUI();
}

// Fallback speech recognition setup
function setupFallbackSpeechRecognition() {
    addDebugLog('🔄 Setting up fallback speech recognition...', 'INFO');
    
    // Create a simple fallback whisper module
    whisperModule = {
        isInitialized: true,
        isRecording: false,
        speechRecognition: null,
        
        async startRecording() {
            addDebugLog('🎤 Starting fallback speech recognition...', 'INFO');
            
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                throw new Error('Speech recognition not supported in this browser');
            }
            
            this.speechRecognition = new SpeechRecognition();
            this.speechRecognition.continuous = true;
            this.speechRecognition.interimResults = true;
            this.speechRecognition.lang = 'en-US';
            
            this.speechRecognition.start();
            this.isRecording = true;
        },
        
        async stopRecording() {
            addDebugLog('🛑 Stopping fallback speech recognition...', 'INFO');
            
            if (this.speechRecognition) {
                this.speechRecognition.stop();
            }
            this.isRecording = false;
        },
        
        async checkMicrophoneStatus() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                return { available: true };
            } catch (error) {
                return { available: false, message: error.message };
            }
        }
    };
    
    addDebugLog('✅ Fallback speech recognition setup complete', 'INFO');
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);