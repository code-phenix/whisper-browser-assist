// Llama Integration for DSL Conversion
class LlamaIntegration {
    constructor() {
        this.llama = null;
        this.isLoaded = false;
        this.isLoading = false;
        this.modelPath = '../model/tinyllama-1.1b-chat-v1.0.Q2_K.gguf';
    }

    async loadModel() {
        if (this.isLoaded || this.isLoading) {
            return this.isLoaded;
        }

        this.isLoading = true;
        
        try {
            console.log('🦙 Loading TinyLlama model...');
            
            // Simulate loading progress for mock implementation
            await this.simulateLoadingProgress();
            
            // Import llama.js wrapper
            const Llama = await import('../llama/llama.js');
            
            if (!Llama.default) {
                throw new Error('Llama module not available');
            }

            // Initialize the model
            this.llama = new Llama.default({
                modelPath: this.modelPath,
                nCtx: 2048,
                nThreads: 4,
                nGpuLayers: 0, // CPU only for browser
                seed: -1,
                f16Kv: false,
                logitsAll: false,
                vocabOnly: false,
                useMlock: false,
                useMmap: true,
                embedding: false,
                loraAdapter: '',
                loraBase: '',
                nUbatch: 512,
                lastNTokensSize: 64,
                repeatPenalty: 1.1,
                frequencyPenalty: 0.0,
                presencePenalty: 0.0,
                temperature: 0.7,
                topP: 0.9,
                topK: 40,
                tfsZ: 1.0,
                typicalP: 1.0,
                mirostat: 0,
                mirostatTau: 5.0,
                mirostatEta: 0.1,
                penalizeNl: true,
                stop: ['</s>', '<|endoftext|>', '<|im_end|>'],
                ignoreEos: false,
                tailFreeSamplingZ: 1.0,
                typicalP: 1.0,
                stream: false
            });

            await this.llama.load();
            this.isLoaded = true;
            this.isLoading = false;
            
            console.log('✅ TinyLlama model loaded successfully');
            return true;
            
        } catch (error) {
            this.isLoading = false;
            console.error('❌ Error loading TinyLlama model:', error);
            throw error;
        }
    }
    
    async simulateLoadingProgress() {
        // Simulate loading steps for better UX
        const steps = [
            { progress: 30, message: 'Downloading model...' },
            { progress: 50, message: 'Initializing weights...' },
            { progress: 70, message: 'Loading vocabulary...' },
            { progress: 85, message: 'Preparing for inference...' },
            { progress: 95, message: 'Finalizing...' }
        ];
        
        for (const step of steps) {
            if (typeof window.updateLlamaProgress === 'function') {
                window.updateLlamaProgress(step.progress, step.message);
            }
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading time
        }
    }

    async convertToDSL(voiceTranscript) {
        if (!this.isLoaded) {
            throw new Error('Llama model not loaded');
        }

        try {
            // Create a prompt for DSL conversion
            const prompt = this.createDSLPrompt(voiceTranscript);
            
            console.log('🔄 Converting voice transcript to DSL...');
            console.log('Input:', voiceTranscript);
            console.log('Prompt:', prompt);

            // Generate response using Llama
            const response = await this.llama.complete(prompt, {
                maxTokens: 256,
                temperature: 0.3,
                topP: 0.9,
                stop: ['</s>', '<|endoftext|>', '<|im_end|>', '\n\n']
            });

            const dslOutput = response.text.trim();
            console.log('✅ DSL Output:', dslOutput);
            
            return dslOutput;
            
        } catch (error) {
            console.error('❌ Error converting to DSL:', error);
            throw error;
        }
    }

    createDSLPrompt(voiceTranscript) {
        return `<|im_start|>system
You are a DSL (Domain Specific Language) converter for a customer care application. Your task is to convert natural language voice commands into structured DSL commands.

Available DSL commands:
- NAVIGATE_TO(section) - Navigate to a specific section (returns, replacements, tracking, contact)
- SUBMIT_FORM(form_type) - Submit a form (return, replacement)
- FILL_FIELD(field_name, value) - Fill a form field
- TRACK_REQUEST(request_number) - Track a request
- SPEAK(message) - Output speech feedback

Voice transcript: "${voiceTranscript}"

Convert this to DSL format. Only return the DSL command, no explanations.
<|im_end|>
<|im_start|>user
Convert this voice command to DSL: "${voiceTranscript}"
<|im_end|>
<|im_start|>assistant
`;
    }

    async unloadModel() {
        if (this.llama) {
            await this.llama.unload();
            this.llama = null;
            this.isLoaded = false;
        }
    }

    getStatus() {
        return {
            isLoaded: this.isLoaded,
            isLoading: this.isLoading,
            modelPath: this.modelPath
        };
    }
}

// Export for use in other modules
window.LlamaIntegration = LlamaIntegration; 