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
        this._isLiveTranscribing = false;
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.audioStream = null;
        this.errorCount = 0;
        this.lastErrorTime = 0;
        this.addDebugLog('WhisperModule constructor called', 'DEBUG');
        
        // Initialize main speech recognition for transcription only
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

    async requestMicrophonePermission() {
        try {
            this.addDebugLog('Requesting microphone permission...', 'DEBUG');
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    channelCount: 1,
                    latency: 0.01
                },
                video: false
            });
            
            // Test the audio stream to ensure it's working
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(this.audioStream);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);
            
            // Check if we're getting audio data
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            
            // If we get any non-zero values, the microphone is working
            const hasAudio = dataArray.some(value => value > 0);
            this.addDebugLog(`Microphone permission granted - Audio detected: ${hasAudio}`, 'INFO');
            
            // Clean up the test
            source.disconnect();
            audioContext.close();
            
            return true;
        } catch (error) {
            this.addDebugLog(`Microphone permission denied: ${error.message}`, 'ERROR');
            return false;
        }
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.speechRecognition = new SpeechRecognition();
            this.speechRecognition.continuous = true; // Changed to true for better continuous recognition
            this.speechRecognition.interimResults = true;
            this.speechRecognition.lang = 'en-US';
            this.speechRecognition.maxAlternatives = 1;
            
            // Add additional configuration for better recognition
            if (this.speechRecognition.grammars) {
                // Add grammar if supported
                this.addDebugLog('Speech recognition grammar support available', 'DEBUG');
            }
            
            // Add better error handling and restart logic
            this.speechRecognition.onstart = () => {
                this._isLiveTranscribing = true;
                this.addDebugLog('Voice recognition started - listening for speech', 'INFO');
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
                            action: 'transcript',
                            param: null,
                            confidence: 0.5,
                            timestamp: new Date().toISOString(),
                            isFinal: false
                        }
                    }));
                }
                
                if (finalTranscript) {
                    this.addDebugLog(`Final transcript: "${finalTranscript}" (confidence: ${event.results[event.results.length - 1][0].confidence})`, 'INFO');
                    // Dispatch final result event
                    document.dispatchEvent(new CustomEvent('whisperResult', {
                        detail: {
                            text: finalTranscript,
                            action: 'transcript',
                            param: null,
                            confidence: event.results[event.results.length - 1][0].confidence,
                            timestamp: new Date().toISOString(),
                            isFinal: true
                        }
                    }));
                }
            };
            
            this.speechRecognition.onerror = (event) => {
                this._isLiveTranscribing = false;
                this.addDebugLog('Voice recognition error: ' + event.error, 'ERROR');
                
                // Track error frequency
                const now = Date.now();
                if (now - this.lastErrorTime < 10000) { // Within 10 seconds
                    this.errorCount++;
                } else {
                    this.errorCount = 1;
                }
                this.lastErrorTime = now;
                
                // If we have too many errors in a short time, run diagnosis
                if (this.errorCount >= 3) {
                    this.addDebugLog('Too many errors detected, running diagnosis...', 'WARN');
                    this.diagnoseRecognitionIssue().then(diagnosis => {
                        this.addDebugLog(`Diagnosis: ${diagnosis.issue} - ${diagnosis.message}`, 'ERROR');
                    });
                    this.errorCount = 0; // Reset counter
                }
                
                // Handle different error types
                if (event.error === 'no-speech') {
                    this.addDebugLog('No speech detected - this is normal, continuing to listen', 'DEBUG');
                    // For no-speech, don't restart immediately - let the continuous mode handle it
                    // The continuous mode should keep listening without needing to restart
                } else if (event.error === 'aborted') {
                    this.addDebugLog('Recognition aborted by user', 'DEBUG');
                    // Don't restart if aborted by user
                } else if (event.error === 'audio-capture') {
                    this.addDebugLog('Audio capture error - microphone may not be available', 'ERROR');
                    // Try to restart after a longer delay for audio issues
                    if (this.isRecording) {
                        setTimeout(() => {
                            if (this.isRecording && !this._isLiveTranscribing) {
                                this.restartRecognition();
                            }
                        }, 5000);
                    }
                } else if (event.error === 'network') {
                    this.addDebugLog('Network error - speech recognition service unavailable', 'ERROR');
                    // Try to restart after a delay for network issues
                    if (this.isRecording) {
                        setTimeout(() => {
                            if (this.isRecording && !this._isLiveTranscribing) {
                                this.restartRecognition();
                            }
                        }, 4000);
                    }
                } else {
                    this.addDebugLog(`Unknown error: ${event.error}`, 'ERROR');
                    // Restart for unknown errors
                    if (this.isRecording) {
                        setTimeout(() => {
                            if (this.isRecording && !this._isLiveTranscribing) {
                                this.restartRecognition();
                            }
                        }, 3000);
                    }
                }
            };
            
            this.speechRecognition.onend = () => {
                this._isLiveTranscribing = false;
                this.addDebugLog('Voice recognition ended', 'INFO');
                
                // Only restart if we're still supposed to be recording
                if (this.isRecording) {
                    setTimeout(() => {
                        if (this.isRecording && !this._isLiveTranscribing) {
                            this.restartRecognition();
                        }
                    }, 1500); // Slightly longer delay for normal end
                } else {
                    this.addDebugLog('Not restarting - recording was stopped by user', 'DEBUG');
                }
            };
        }
    }

    restartRecognition() {
        if (!this.speechRecognition) {
            this.addDebugLog('Cannot restart - speech recognition not initialized', 'ERROR');
            return;
        }
        
        if (this._isLiveTranscribing) {
            this.addDebugLog('Skipping restart - recognition already active', 'DEBUG');
            return;
        }
        
        if (!this.isRecording) {
            this.addDebugLog('Skipping restart - not currently recording', 'DEBUG');
            return;
        }
        
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
            
            // Retry after a delay
            setTimeout(() => {
                if (!this._isLiveTranscribing && this.isRecording) {
                    try {
                        this.speechRecognition.start();
                        this.addDebugLog('Second attempt to restart voice recognition', 'INFO');
                    } catch (e2) {
                        this.addDebugLog('Second attempt failed: ' + e2.message, 'ERROR');
                        
                        // If second attempt fails, try one more time after a longer delay
                        setTimeout(() => {
                            if (!this._isLiveTranscribing && this.isRecording) {
                                try {
                                    this.speechRecognition.start();
                                    this.addDebugLog('Third attempt to restart voice recognition', 'INFO');
                                } catch (e3) {
                                    this.addDebugLog('Third attempt failed: ' + e3.message, 'ERROR');
                                    this.addDebugLog('Giving up on restart attempts', 'ERROR');
                                }
                            }
                        }, 5000);
                    }
                }
            }, 2000);
        }
    }

    async init() {
        this.addDebugLog('Initializing WhisperModule...', 'DEBUG');
        
        try {
            // Request microphone permission first
            const hasPermission = await this.requestMicrophonePermission();
            if (!hasPermission) {
                throw new Error('Microphone permission denied');
            }
            
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
        
        // Ensure we have microphone permission and test it
        if (!this.audioStream) {
            this.addDebugLog('No audio stream available, requesting permission...', 'DEBUG');
            const hasPermission = await this.requestMicrophonePermission();
            if (!hasPermission) {
                this.addDebugLog('Cannot start recording - microphone permission denied', 'ERROR');
                return;
            }
        }
        
        // Test microphone before starting recognition
        const micTest = await this.testMicrophone();
        if (!micTest.working) {
            this.addDebugLog(`Microphone test failed: ${micTest.error}`, 'ERROR');
            return;
        }
        
        this.isRecording = true;
        this.addDebugLog('Recording started', 'INFO');
        
        // Start voice recognition directly
        if (this.speechRecognition && !this._isLiveTranscribing) {
            this.addDebugLog('Starting voice recognition...', 'DEBUG');
            try {
                this.speechRecognition.start();
            } catch (e) {
                this.addDebugLog('Voice recognition already started or failed: ' + e.message, 'WARN');
                // Don't reset recording state, let the error handler deal with it
                // this.isRecording = false;
            }
        } else if (this._isLiveTranscribing) {
            this.addDebugLog('Voice recognition already active - skipping start', 'DEBUG');
        } else {
            this.addDebugLog('Speech recognition not available', 'ERROR');
            this.isRecording = false;
        }
        
        console.log('🎤 Voice recognition started - speak to see transcription!');
    }

    async stopRecording() {
        this.addDebugLog('stopRecording called', 'DEBUG');
        
        if (!this.isRecording) {
            this.addDebugLog('Not currently recording - skipping stop', 'WARN');
            return;
        }
        
        this.isRecording = false;
        
        // Stop voice recognition
        if (this.speechRecognition && this._isLiveTranscribing) {
            try {
                this.speechRecognition.stop();
                this.addDebugLog('Voice recognition stopped', 'INFO');
            } catch (e) {
                this.addDebugLog('Failed to stop voice recognition: ' + e.message, 'WARN');
            }
        }
        
        this._isLiveTranscribing = false;
        
        // Stop audio stream if it exists
        if (this.audioStream) {
            try {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.addDebugLog('Audio stream stopped', 'DEBUG');
            } catch (e) {
                this.addDebugLog('Failed to stop audio stream: ' + e.message, 'WARN');
            }
            this.audioStream = null;
        }
        
        this.addDebugLog('Recording stopped', 'INFO');
        console.log('🛑 Recording stopped');
    }

    forceRestart() {
        this.addDebugLog('Force restarting voice recognition', 'INFO');
        
        // Stop current recognition if active
        if (this.speechRecognition && this._isLiveTranscribing) {
            try {
                this.speechRecognition.stop();
                this.addDebugLog('Stopped current recognition for force restart', 'DEBUG');
            } catch (e) {
                this.addDebugLog('Failed to stop current recognition: ' + e.message, 'WARN');
            }
        }
        
        // Reset state
        this._isLiveTranscribing = false;
        
        // Restart after a short delay
        setTimeout(() => {
            if (this.isRecording) {
                this.restartRecognition();
            }
        }, 1000);
    }

    getDebugLog() {
        return this.debugLog;
    }

    get isLiveTranscribing() {
        return this._isLiveTranscribing;
    }

    async checkMicrophoneStatus() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = devices.filter(device => device.kind === 'audioinput');
            
            if (audioDevices.length === 0) {
                this.addDebugLog('No microphone devices found', 'WARN');
                return { available: false, message: 'No microphone devices found' };
            }
            
            this.addDebugLog(`Found ${audioDevices.length} microphone device(s)`, 'INFO');
            return { available: true, devices: audioDevices };
        } catch (error) {
            this.addDebugLog(`Error checking microphone status: ${error.message}`, 'ERROR');
            return { available: false, message: error.message };
        }
    }

    async testMicrophone() {
        try {
            this.addDebugLog('Testing microphone functionality...', 'DEBUG');
            
            if (!this.audioStream) {
                return { working: false, error: 'No audio stream available' };
            }
            
            // Create audio context to test the stream
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(this.audioStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            
            // Wait a moment for audio to be processed
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check audio levels
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            
            // Calculate average audio level
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const maxLevel = Math.max(...dataArray);
            
            this.addDebugLog(`Microphone test - Average level: ${average.toFixed(2)}, Max level: ${maxLevel}`, 'DEBUG');
            
            // Clean up
            source.disconnect();
            audioContext.close();
            
            // Consider microphone working if we can detect any audio activity
            const isWorking = maxLevel > 0 || average > 0;
            
            return { 
                working: isWorking, 
                averageLevel: average,
                maxLevel: maxLevel,
                error: isWorking ? null : 'No audio detected from microphone'
            };
            
        } catch (error) {
            this.addDebugLog(`Microphone test error: ${error.message}`, 'ERROR');
            return { working: false, error: error.message };
        }
    }

    async diagnoseRecognitionIssue() {
        this.addDebugLog('Diagnosing recognition issues...', 'DEBUG');
        
        // Check microphone status
        const micStatus = await this.checkMicrophoneStatus();
        if (!micStatus.available) {
            return { issue: 'microphone_not_available', message: micStatus.message };
        }
        
        // Test microphone functionality
        const micTest = await this.testMicrophone();
        if (!micTest.working) {
            return { issue: 'microphone_not_working', message: micTest.error };
        }
        
        // Check speech recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            return { issue: 'speech_recognition_not_supported', message: 'Speech recognition not supported in this browser' };
        }
        
        // Check if we have an active audio stream
        if (!this.audioStream) {
            return { issue: 'no_audio_stream', message: 'No active audio stream' };
        }
        
        return { issue: 'unknown', message: 'All checks passed but recognition still failing' };
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