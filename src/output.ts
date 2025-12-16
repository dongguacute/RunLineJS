export class StreamOutput {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private onDataCallback: ((data: Blob) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {}

  /**
   * Starts capturing the canvas stream and recording it.
   * @param onData Callback function to receive video data blobs.
   * @param intervalMilliseconds The interval at which to fire dataavailable events (e.g., for streaming).
   * @param mimeType Optional mimeType. Defaults to 'video/mp4' if supported, else 'video/webm'.
   */
  public start(
    onData: (data: Blob) => void,
    intervalMilliseconds: number = 1000,
    mimeType?: string
  ) {
    this.onDataCallback = onData;
    this.stream = this.canvas.captureStream(60); // Capture at 60 FPS

    const options: MediaRecorderOptions = {};
    
    if (mimeType) {
      options.mimeType = mimeType;
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      options.mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
      options.mimeType = 'video/webm;codecs=h264';
    } else {
      options.mimeType = 'video/webm';
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, options);
    } catch (e) {
      console.error('Failed to create MediaRecorder:', e);
      throw e;
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0 && this.onDataCallback) {
        this.onDataCallback(event.data);
      }
    };

    this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
    };

    this.mediaRecorder.start(intervalMilliseconds);
  }

  public stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.onDataCallback = null;
  }

  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
