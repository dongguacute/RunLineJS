export class FMP4Receiver {
  private videoElement: HTMLVideoElement;
  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer | null = null;
  private queue: ArrayBuffer[] = [];
  private mimeType: string;

  constructor(videoId: string, mimeType: string = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"') {
    const element = document.getElementById(videoId);
    if (!element || !(element instanceof HTMLVideoElement)) {
      throw new Error(`Video element with id '${videoId}' not found or is not a video element.`);
    }
    this.videoElement = element;
    this.mimeType = mimeType;
    this.mediaSource = new MediaSource();
    
    this.videoElement.src = URL.createObjectURL(this.mediaSource);
    
    this.mediaSource.addEventListener('sourceopen', this.onSourceOpen.bind(this));
  }

  private onSourceOpen() {
    if (this.mediaSource.sourceBuffers.length > 0) return;

    try {
      this.sourceBuffer = this.mediaSource.addSourceBuffer(this.mimeType);
      this.sourceBuffer.addEventListener('updateend', this.processQueue.bind(this));
      this.sourceBuffer.addEventListener('error', (e) => console.error('SourceBuffer error:', e));
    } catch (e) {
      console.error('Failed to add SourceBuffer:', e);
    }
  }

  public push(data: ArrayBuffer) {
    this.queue.push(data);
    this.processQueue();
  }

  private processQueue() {
    if (!this.sourceBuffer || this.sourceBuffer.updating) {
      return;
    }

    if (this.queue.length > 0) {
      const data = this.queue.shift();
      if (data) {
        try {
          this.sourceBuffer.appendBuffer(data);
        } catch (e) {
          console.error('Error appending buffer:', e);
          // Put it back in front if it failed due to full buffer? 
          // Usually we might want to clear buffer if full, but for now just log.
        }
      }
    }
  }

  public destroy() {
    if (this.videoElement.src) {
      URL.revokeObjectURL(this.videoElement.src);
      this.videoElement.removeAttribute('src');
    }
    this.queue = [];
  }
}

// Keep the original function name as an entry point if desired, or replace usage.
// Assuming the user wants to use this file to handle input.
export function handleInput(videoId: string): FMP4Receiver {
  return new FMP4Receiver(videoId);
}
