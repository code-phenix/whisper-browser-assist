// DSL Executor for Customer Care Application
class DSLExecutor {
    constructor() {
        this.commands = [];
        this.executionHistory = [];
    }

    async executeDSL(dslCommand, context = {}) {
        try {
            console.log('🔧 Executing DSL command:', dslCommand);
            
            const result = {
                command: dslCommand,
                timestamp: new Date().toISOString(),
                success: false,
                output: null,
                error: null
            };

            // Parse the DSL command
            const parsedCommand = this.parseDSLCommand(dslCommand);
            
            if (!parsedCommand) {
                result.error = 'Invalid DSL command format';
                this.executionHistory.push(result);
                return result;
            }

            // Execute the command
            switch (parsedCommand.action) {
                case 'NAVIGATE_TO':
                    result.output = await this.navigateToSection(parsedCommand.params[0]);
                    result.success = true;
                    break;
                    
                case 'SUBMIT_FORM':
                    result.output = await this.submitForm(parsedCommand.params[0]);
                    result.success = true;
                    break;
                    
                case 'FILL_FIELD':
                    result.output = await this.fillField(parsedCommand.params[0], parsedCommand.params[1]);
                    result.success = true;
                    break;
                    
                case 'TRACK_REQUEST':
                    result.output = await this.trackRequest(parsedCommand.params[0]);
                    result.success = true;
                    break;
                    
                case 'SPEAK':
                    result.output = await this.speak(parsedCommand.params[0]);
                    result.success = true;
                    break;
                
            default:
                    result.error = `Unknown command: ${parsedCommand.action}`;
            }

            this.executionHistory.push(result);
            return result;
            
        } catch (error) {
            console.error('❌ DSL execution error:', error);
            const result = {
                command: dslCommand,
                timestamp: new Date().toISOString(),
                success: false,
                output: null,
                error: error.message
            };
            this.executionHistory.push(result);
            return result;
        }
    }

    parseDSLCommand(dslCommand) {
        try {
            // Remove extra whitespace and normalize
            const cleanCommand = dslCommand.trim();
            
            // Match pattern: COMMAND(param1, param2, ...)
            const match = cleanCommand.match(/^(\w+)\(([^)]*)\)$/);
            
            if (!match) {
                return null;
            }

            const action = match[1];
            const paramsString = match[2];
            
            // Parse parameters
            const params = this.parseParameters(paramsString);
            
            return {
                action: action,
                params: params
            };
            
        } catch (error) {
            console.error('Error parsing DSL command:', error);
            return null;
        }
    }

    parseParameters(paramsString) {
        if (!paramsString || paramsString.trim() === '') {
            return [];
        }

        const params = [];
        let currentParam = '';
        let inQuotes = false;
        let quoteChar = '';
        let depth = 0;

        for (let i = 0; i < paramsString.length; i++) {
            const char = paramsString[i];
            
            if (char === '"' || char === "'") {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    inQuotes = false;
                } else {
                    currentParam += char;
                }
            } else if (char === '(') {
                if (!inQuotes) depth++;
                currentParam += char;
            } else if (char === ')') {
                if (!inQuotes) depth--;
                currentParam += char;
            } else if (char === ',' && depth === 0 && !inQuotes) {
                params.push(currentParam.trim());
                currentParam = '';
            } else {
                currentParam += char;
            }
        }

        if (currentParam.trim()) {
            params.push(currentParam.trim());
        }

        return params.map(param => {
            // Remove quotes if present
            if ((param.startsWith('"') && param.endsWith('"')) || 
                (param.startsWith("'") && param.endsWith("'"))) {
                return param.slice(1, -1);
            }
            return param;
        });
    }

    async navigateToSection(sectionName) {
        console.log('🧭 Navigating to section:', sectionName);
        
        // Update active nav link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionName}`) {
                link.classList.add('active');
            }
        });
        
        // Show target section
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
            return `Navigated to ${sectionName} section`;
        } else {
            throw new Error(`Section '${sectionName}' not found`);
        }
    }

    async submitForm(formType) {
        console.log('📝 Submitting form:', formType);
        
        let form = null;
        if (formType === 'return') {
            form = document.querySelector('.return-form');
        } else if (formType === 'replacement') {
            form = document.querySelector('.replacement-form');
        }
        
        if (form) {
            form.dispatchEvent(new Event('submit'));
            return `Submitted ${formType} form`;
        } else {
            throw new Error(`Form '${formType}' not found`);
        }
    }

    async fillField(fieldName, value) {
        console.log('✏️ Filling field:', fieldName, 'with value:', value);
        
        const field = document.querySelector(`[name="${fieldName}"], [id="${fieldName}"]`);
        if (field) {
            field.value = value;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            return `Filled field '${fieldName}' with '${value}'`;
        } else {
            throw new Error(`Field '${fieldName}' not found`);
        }
    }

    async trackRequest(requestNumber) {
        console.log('📊 Tracking request:', requestNumber);
        
        const trackingInput = document.getElementById('trackingNumber');
        if (trackingInput) {
            trackingInput.value = requestNumber;
            document.getElementById('trackingResults').style.display = 'block';
            return `Tracking request ${requestNumber}`;
        } else {
            throw new Error('Tracking input not found');
        }
    }

    async speak(message) {
        console.log('🔊 Speaking:', message);
        
        // Check if speech is enabled globally
        if (typeof window.isSpeechEnabled !== 'undefined' && !window.isSpeechEnabled) {
            console.log('🔇 Speech disabled, skipping speak command');
            // Add debug log to the main application if available
            if (typeof window.addDebugLog === 'function') {
                window.addDebugLog(`🔇 Speech disabled, skipping: "${message}"`, 'INFO');
            }
            return `Speech disabled: "${message}"`;
        }
        
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            speechSynthesis.speak(utterance);
            return `Spoke: "${message}"`;
        } else {
            throw new Error('Speech synthesis not available');
        }
    }

    getExecutionHistory() {
        return this.executionHistory;
    }

    clearHistory() {
        this.executionHistory = [];
    }
}

// Export for use in other modules
window.DSLExecutor = DSLExecutor; 