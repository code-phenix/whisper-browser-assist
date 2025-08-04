# Llama Integration for Browser DSL Conversion

This directory contains the integration for using TinyLlama model in the browser for converting voice transcripts to Domain Specific Language (DSL).

## Current Implementation

The current implementation uses a mock wrapper (`llama.js`) that simulates the Llama model behavior. This allows testing of the DSL conversion pipeline without requiring the full model to be loaded.

## To Integrate Real TinyLlama Model

### Option 1: Using llama.cpp.js

1. **Download llama.cpp.js**: Get the WebAssembly version of llama.cpp from the official repository
2. **Replace the mock implementation**: Update `llama.js` to use the actual llama.cpp.js
3. **Load the model**: Ensure the TinyLlama model file is accessible via HTTP

### Option 2: Using WebGPU/WebGL

1. **Use a WebGPU-based implementation**: Libraries like `@llama-node/llama-cpp` with WebGPU support
2. **Optimize for browser**: Ensure the model is quantized and optimized for browser execution

### Option 3: Server-side Processing

1. **Create a backend API**: Process DSL conversion on the server
2. **Send voice transcripts**: Make HTTP requests to the server for conversion
3. **Receive DSL commands**: Get the converted DSL back to the browser

## Model Requirements

- **Model**: TinyLlama-1.1B-Chat-v1.0.Q2_K.gguf
- **Size**: ~1.1GB (quantized)
- **Format**: GGUF (GGML Universal Format)
- **Optimization**: Q2_K quantization for browser compatibility

## DSL Commands Supported

- `NAVIGATE_TO(section)` - Navigate to UI sections
- `SUBMIT_FORM(form_type)` - Submit forms
- `FILL_FIELD(field_name, value)` - Fill form fields
- `TRACK_REQUEST(request_number)` - Track requests
- `SPEAK(message)` - Output speech feedback

## Performance Considerations

- **Loading time**: Model loading can take 10-30 seconds
- **Memory usage**: ~500MB-1GB RAM required
- **Processing time**: 1-3 seconds per conversion
- **Browser compatibility**: Requires WebAssembly support

## Testing

The current mock implementation allows testing of:
- Voice command processing
- DSL command generation
- DSL command execution
- UI updates and feedback

## Next Steps

1. Implement real llama.cpp.js integration
2. Add model loading progress indicators
3. Optimize for faster processing
4. Add error handling for model failures
5. Implement caching for common commands 