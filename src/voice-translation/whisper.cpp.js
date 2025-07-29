// Real Whisper.js implementation using Web Speech API
// This provides actual speech recognition functionality

class WhisperModule {
    constructor() {
        this.isInitialized = false;
        this.audioContext = null;
        this.mediaRecorder = null;
        this.isRecording = false;
        this.audioChunks = [];
        this.debugLog = [];
        this.speechRecognition = null;
        this.isLiveTranscribing = false;
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.addDebugLog('WhisperModule constructor called', 'DEBUG');
        
        // Initialize main speech recognition for commands (no wake word needed)
        this.initSpeechRecognition();
    }

    addDebugLog(message, type = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] [WHISPER-${type}] ${message}`;
        this.debugLog.push(logEntry);
        console.log(logEntry);
        
        // Keep only last 20 log entries
        if (this.debugLog.length > 20) {
            this.debugLog.shift();
        }
    }

    initWakeWordRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.wakeWordRecognition = new SpeechRecognition();
            this.wakeWordRecognition.continuous = false; // Changed to false for better stability
            this.wakeWordRecognition.interimResults = false; // Changed to false for wake word detection
            this.wakeWordRecognition.lang = 'en-US';
            this.wakeWordRecognition.maxAlternatives = 1;
            
            this.wakeWordRecognition.onstart = () => {
                this.addDebugLog('Wake word detection started', 'INFO');
            };
            
            this.wakeWordRecognition.onresult = (event) => {
                if (event.results.length > 0) {
                    const transcript = event.results[0][0].transcript.toLowerCase().trim();
                    this.addDebugLog(`Wake word check: "${transcript}"`, 'DEBUG');
                    
                    if (transcript.includes(this.wakeWord)) {
                        this.addDebugLog('Wake word detected! Starting command mode...', 'INFO');
                        this.activateCommandMode();
                        return;
                    }
                }
                
                // If no wake word detected, restart after a short delay
                if (this.isWakeWordMode) {
                    setTimeout(() => {
                        if (this.isWakeWordMode) {
                            try { 
                                this.wakeWordRecognition.start(); 
                            } catch (e) { 
                                this.addDebugLog('Failed to restart wake word detection: ' + e.message, 'ERROR');
                            }
                        }
                    }, 500); // Increased delay for better stability
                }
            };
            
            this.wakeWordRecognition.onerror = (event) => {
                this.addDebugLog('Wake word recognition error: ' + event.error, 'ERROR');
                
                // Only restart if it's not a user-initiated stop
                if (this.isWakeWordMode && event.error !== 'aborted') {
                    setTimeout(() => {
                        if (this.isWakeWordMode) {
                            try { 
                                this.wakeWordRecognition.start(); 
                            } catch (e) { 
                                this.addDebugLog('Failed to restart after error: ' + e.message, 'ERROR');
                            }
                        }
                    }, 1000); // Longer delay after errors
                }
            };
            
            this.wakeWordRecognition.onend = () => {
                // Only restart if we're still in wake word mode and it wasn't manually stopped
                if (this.isWakeWordMode) {
                    this.addDebugLog('Wake word detection ended, restarting...', 'DEBUG');
                    setTimeout(() => {
                        if (this.isWakeWordMode) {
                            try { 
                                this.wakeWordRecognition.start(); 
                            } catch (e) { 
                                this.addDebugLog('Failed to restart wake word detection: ' + e.message, 'ERROR');
                            }
                        }
                    }, 500);
                }
            };
        }
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.speechRecognition = new SpeechRecognition();
            this.speechRecognition.continuous = false; // Changed back to false for better stability
            this.speechRecognition.interimResults = true;
            this.speechRecognition.lang = 'en-US';
            this.speechRecognition.maxAlternatives = 1;
            
            this.speechRecognition.onstart = () => {
                this.isLiveTranscribing = true;
                this.addDebugLog('Voice recognition started - listening for commands', 'INFO');
            };
            
            this.speechRecognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                if (interimTranscript) {
                    this.addDebugLog(`Interim transcript: "${interimTranscript}"`, 'DEBUG');
                    // Dispatch interim result event
                    document.dispatchEvent(new CustomEvent('whisperResult', {
                        detail: {
                            text: interimTranscript,
                            action: '',
                            param: null,
                            confidence: 0.5,
                            timestamp: new Date().toISOString(),
                            isFinal: false
                        }
                    }));
                }
                
                if (finalTranscript) {
                    this.addDebugLog(`Final transcript: "${finalTranscript}" (confidence: ${event.results[event.results.length - 1][0].confidence})`, 'INFO');
                    this.processCommand(finalTranscript);
                }
            };
            
            this.speechRecognition.onerror = (event) => {
                this.isLiveTranscribing = false;
                this.addDebugLog('Voice recognition error: ' + event.error, 'ERROR');
                
                // Only restart for certain errors, not for no-speech or aborted
                if (event.error !== 'aborted' && event.error !== 'no-speech') {
                    setTimeout(() => {
                        this.restartRecognition();
                    }, 2000); // Longer delay after errors
                } else if (event.error === 'no-speech') {
                    // For no-speech, restart after a longer delay
                    setTimeout(() => {
                        this.restartRecognition();
                    }, 3000);
                }
            };
            
            this.speechRecognition.onend = () => {
                this.isLiveTranscribing = false;
                this.addDebugLog('Voice recognition ended', 'INFO');
                
                // Only restart if we're still supposed to be recording
                if (this.isRecording) {
                    setTimeout(() => {
                        this.restartRecognition();
                    }, 2000); // Longer delay for stability
                } else {
                    this.addDebugLog('Not restarting - recording was stopped by user', 'DEBUG');
                }
            };
        }
    }

    restartRecognition() {
        if (this.speechRecognition && !this.isLiveTranscribing) {
            try {
                this.speechRecognition.start();
                this.addDebugLog('Restarting voice recognition', 'INFO');
            } catch (e) {
                this.addDebugLog('Failed to restart voice recognition: ' + e.message, 'ERROR');
                // Try to stop first, then restart
                try {
                    this.speechRecognition.stop();
                    this.addDebugLog('Stopped recognition before retry', 'DEBUG');
                } catch (stopError) {
                    this.addDebugLog('Failed to stop recognition: ' + stopError.message, 'DEBUG');
                }
                
                // Only retry if we're still not transcribing
                setTimeout(() => {
                    if (!this.isLiveTranscribing) {
                        try {
                            this.speechRecognition.start();
                            this.addDebugLog('Second attempt to restart voice recognition', 'INFO');
                        } catch (e2) {
                            this.addDebugLog('Second attempt failed: ' + e2.message, 'ERROR');
                        }
                    }
                }, 3000);
            }
        } else if (this.isLiveTranscribing) {
            this.addDebugLog('Skipping restart - recognition already active', 'DEBUG');
        }
    }

    // Wake word functions removed - voice recognition works directly now

    async init() {
        this.addDebugLog('Initializing WhisperModule...', 'DEBUG');
        
        try {
            // Initialize speech recognition if available
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                this.addDebugLog('Speech recognition not supported in this browser', 'ERROR');
                throw new Error('Speech recognition not supported');
            }
            
            this.addDebugLog('Speech recognition initialized successfully', 'INFO');
            this.isInitialized = true;
            
            // Don't auto-start recognition - let user control it
            this.addDebugLog('Voice recognition ready - use startRecording() to begin', 'INFO');
            
        } catch (error) {
            this.addDebugLog(`Initialization failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    processCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        this.addDebugLog(`Processing command: "${transcript}"`, 'DEBUG');
        
        // Define command patterns for customer care website
        const commands = [
            // Navigation commands - handle both singular and plural forms
            { pattern: /go to return/i, action: 'navigate', param: 'returns' },
            { pattern: /go to returns/i, action: 'navigate', param: 'returns' },
            { pattern: /go to replacement/i, action: 'navigate', param: 'replacements' },
            { pattern: /go to replacements/i, action: 'navigate', param: 'replacements' },
            { pattern: /go to track/i, action: 'navigate', param: 'tracking' },
            { pattern: /go to tracking/i, action: 'navigate', param: 'tracking' },
            { pattern: /go to status/i, action: 'navigate', param: 'tracking' },
            { pattern: /go to contact/i, action: 'navigate', param: 'contact' },
            { pattern: /go to support/i, action: 'navigate', param: 'contact' },
            { pattern: /go to help/i, action: 'navigate', param: 'contact' },
            
            { pattern: /show return/i, action: 'navigate', param: 'returns' },
            { pattern: /show returns/i, action: 'navigate', param: 'returns' },
            { pattern: /show replacement/i, action: 'navigate', param: 'replacements' },
            { pattern: /show replacements/i, action: 'navigate', param: 'replacements' },
            { pattern: /show track/i, action: 'navigate', param: 'tracking' },
            { pattern: /show tracking/i, action: 'navigate', param: 'tracking' },
            { pattern: /show status/i, action: 'navigate', param: 'tracking' },
            { pattern: /show contact/i, action: 'navigate', param: 'contact' },
            { pattern: /show support/i, action: 'navigate', param: 'contact' },
            { pattern: /show help/i, action: 'navigate', param: 'contact' },
            
            { pattern: /open return/i, action: 'navigate', param: 'returns' },
            { pattern: /open returns/i, action: 'navigate', param: 'returns' },
            { pattern: /open replacement/i, action: 'navigate', param: 'replacements' },
            { pattern: /open replacements/i, action: 'navigate', param: 'replacements' },
            { pattern: /open track/i, action: 'navigate', param: 'tracking' },
            { pattern: /open tracking/i, action: 'navigate', param: 'tracking' },
            { pattern: /open status/i, action: 'navigate', param: 'tracking' },
            { pattern: /open contact/i, action: 'navigate', param: 'contact' },
            { pattern: /open support/i, action: 'navigate', param: 'contact' },
            { pattern: /open help/i, action: 'navigate', param: 'contact' },
            
            // Form actions
            { pattern: /submit form/i, action: 'submit_form' },
            { pattern: /submit return/i, action: 'submit_return' },
            { pattern: /submit replacement/i, action: 'submit_replacement' },
            { pattern: /track request/i, action: 'track_request' },
            { pattern: /check status/i, action: 'track_request' },
            
            // Button clicks
            { pattern: /click (.+)/i, action: 'click', param: '$1' },
            { pattern: /press (.+)/i, action: 'click', param: '$1' },
            { pattern: /select (.+)/i, action: 'click', param: '$1' },
            
            // Scrolling
            { pattern: /scroll down/i, action: 'scroll_down' },
            { pattern: /scroll up/i, action: 'scroll_up' },
            { pattern: /go down/i, action: 'scroll_down' },
            { pattern: /go up/i, action: 'scroll_up' },
            { pattern: /move down/i, action: 'scroll_down' },
            { pattern: /move up/i, action: 'scroll_up' },
            
            // Reading
            { pattern: /read page/i, action: 'read_page' },
            { pattern: /read content/i, action: 'read_page' },
            { pattern: /read this/i, action: 'read_page' },
            
            // Voice control
            { pattern: /start listening/i, action: 'start_listening' },
            { pattern: /stop listening/i, action: 'stop_listening' },
            { pattern: /start recording/i, action: 'start_listening' },
            { pattern: /stop recording/i, action: 'stop_listening' },
            
            // Customer service specific
            { pattern: /call support/i, action: 'call_support' },
            { pattern: /contact support/i, action: 'contact_support' },
            { pattern: /live chat/i, action: 'live_chat' },
            { pattern: /send email/i, action: 'send_email' },
            { pattern: /help me/i, action: 'help' },
            { pattern: /i need help/i, action: 'help' },
            
            // Form filling helpers
            { pattern: /fill order number (.+)/i, action: 'fill_field', param: 'orderNumber:$1' },
            { pattern: /fill email (.+)/i, action: 'fill_field', param: 'email:$1' },
            { pattern: /reason (.+)/i, action: 'fill_field', param: 'returnReason:$1' },
            { pattern: /defect (.+)/i, action: 'fill_field', param: 'defectType:$1' }
        ];
        
        // Check for matches
        for (const command of commands) {
            const match = transcript.match(command.pattern);
            if (match) {
                let param = null;
                if (command.param && match[1]) {
                    param = match[1].trim();
                }
                
                this.addDebugLog(`Command matched: ${command.action}${param ? ` with param: "${param}"` : ''}`, 'INFO');
                
                // Trigger the command event
                const event = new CustomEvent('whisperResult', { 
                    detail: {
                        text: transcript,
                        action: command.action,
                        param: param,
                        confidence: 0.9,
                        timestamp: new Date().toISOString(),
                        isFinal: true
                    }
                });
                document.dispatchEvent(event);
                return;
            }
        }
        
        // No command matched
        this.addDebugLog(`No command pattern matched: "${transcript}"`, 'WARN');
        
        // Still trigger event for unrecognized commands
        const event = new CustomEvent('whisperResult', { 
            detail: {
                text: transcript,
                action: 'unknown',
                confidence: 0.9,
                timestamp: new Date().toISOString(),
                isFinal: true
            }
        });
        document.dispatchEvent(event);
    }

    async startRecording() {
        this.addDebugLog('startRecording called', 'DEBUG');
        if (!this.isInitialized) {
            this.addDebugLog('Module not initialized, initializing...', 'DEBUG');
            await this.init();
        }
        
        // Check if already recording
        if (this.isRecording) {
            this.addDebugLog('Already recording - skipping start', 'WARN');
            return;
        }
        
        this.isRecording = true;
        this.addDebugLog('Recording started', 'INFO');
        
        // Start voice recognition directly
        if (this.speechRecognition && !this.isLiveTranscribing) {
            this.addDebugLog('Starting voice recognition...', 'DEBUG');
            try {
                this.speechRecognition.start();
            } catch (e) {
                this.addDebugLog('Voice recognition already started or failed: ' + e.message, 'WARN');
                // Reset recording state if start failed
                this.isRecording = false;
            }
        } else if (this.isLiveTranscribing) {
            this.addDebugLog('Voice recognition already active - skipping start', 'DEBUG');
        }
        
        console.log('🎤 Voice recognition started - speak commands directly!');
    }

    async stopRecording() {
        this.addDebugLog('stopRecording called', 'DEBUG');
        
        if (!this.isRecording) {
            this.addDebugLog('Not currently recording - skipping stop', 'WARN');
            return;
        }
        
        this.isRecording = false;
        
        // Stop voice recognition
        if (this.speechRecognition && this.isLiveTranscribing) {
            try {
                this.speechRecognition.stop();
                this.addDebugLog('Voice recognition stopped', 'INFO');
            } catch (e) {
                this.addDebugLog('Failed to stop voice recognition: ' + e.message, 'WARN');
            }
        }
        
        this.isLiveTranscribing = false;
        
        this.addDebugLog('Recording stopped', 'INFO');
        console.log('🛑 Recording stopped');
    }

    getDebugLog() {
        return this.debugLog;
    }
}

// Global function that main.js expects
function createWhisperModule(options = {}) {
    console.log('[DEBUG] Creating WhisperModule with options:', options);
    return new Promise(async (resolve) => {
        const module = new WhisperModule();
        await module.init();
        resolve(module);
    });
}

// Add some utility functions
window.WhisperModule = WhisperModule;
window.createWhisperModule = createWhisperModule;

console.log('[INFO] Whisper.js module loaded successfully');