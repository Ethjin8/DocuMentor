class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    // We'll accumulate samples and send chunks of ~4096 samples at 16kHz (~256ms)
    this._chunkSize = 4096;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const inputData = input[0]; // Float32, mono channel, at sampleRate (44100 or 48000)
    const ratio = sampleRate / 16000;

    // Simple linear downsampling to 16kHz
    for (let i = 0; i < inputData.length; i += ratio) {
      const idx = Math.floor(i);
      if (idx < inputData.length) {
        this._buffer.push(inputData[idx]);
      }
    }

    if (this._buffer.length >= this._chunkSize) {
      // Convert float32 [-1, 1] to int16 PCM
      const pcm = new Int16Array(this._buffer.length);
      for (let i = 0; i < this._buffer.length; i++) {
        const s = Math.max(-1, Math.min(1, this._buffer[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.port.postMessage({ pcm: pcm.buffer }, [pcm.buffer]);
      this._buffer = [];
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
