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

export class VideoController {
  private videoElement: HTMLVideoElement;
  private fileInput: HTMLInputElement | null = null;
  private frameDuration: number = 1 / 30; // Default to 30 FPS

  constructor(elementIdOrElement: string | HTMLVideoElement) {
    if (typeof elementIdOrElement === 'string') {
      const element = document.getElementById(elementIdOrElement);
      if (!element || !(element instanceof HTMLVideoElement)) {
        throw new Error(`Video element with id '${elementIdOrElement}' not found.`);
      }
      this.videoElement = element;
    } else {
      this.videoElement = elementIdOrElement;
    }
  }

  /**
   * Sets the estimated frame rate for stepping.
   * @param fps Frames per second (e.g., 30, 60).
   */
  public setFrameRate(fps: number) {
    if (fps > 0) {
      this.frameDuration = 1 / fps;
    }
  }

  /**
   * Steps forward by a number of frames.
   * @param frames Number of frames to step (default 1).
   */
  public stepForward(frames: number = 1) {
    this.pause();
    this.videoElement.currentTime = Math.min(
      this.videoElement.duration || Infinity,
      this.videoElement.currentTime + (frames * this.frameDuration)
    );
  }

  /**
   * Steps backward by a number of frames.
   * @param frames Number of frames to step (default 1).
   */
  public stepBackward(frames: number = 1) {
    this.pause();
    this.videoElement.currentTime = Math.max(
      0,
      this.videoElement.currentTime - (frames * this.frameDuration)
    );
  }

  /**
   * Creates a hidden file input and triggers the system file dialog.
   * @param onFileSelected Optional callback when a file is selected.
   */
  public triggerFileUpload(onFileSelected?: (file: File) => void) {
    if (!this.fileInput) {
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.accept = 'video/mp4,video/webm,video/*';
      this.fileInput.style.display = 'none';
      document.body.appendChild(this.fileInput);

      this.fileInput.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          this.loadVideoFile(file);
          if (onFileSelected) onFileSelected(file);
        }
        // Reset so the same file can be selected again
        target.value = '';
      });
    }

    this.fileInput.click();
  }

  /**
   * Loads a video file into the video element.
   * @param file The video file to load.
   */
  public loadVideoFile(file: File) {
    if (this.videoElement.src) {
      URL.revokeObjectURL(this.videoElement.src);
    }
    const url = URL.createObjectURL(file);
    this.videoElement.src = url;
    this.videoElement.load();
  }

  /**
   * Plays the video.
   */
  public play(): Promise<void> {
    return this.videoElement.play();
  }

  /**
   * Pauses the video.
   */
  public pause() {
    this.videoElement.pause();
  }

  /**
   * Toggles play/pause state.
   */
  public togglePlay() {
    if (this.videoElement.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  /**
   * Seeks to a specific time in seconds.
   * @param time Time in seconds.
   */
  public seek(time: number) {
    if (Number.isFinite(time)) {
      this.videoElement.currentTime = Math.max(0, Math.min(time, this.videoElement.duration || Infinity));
    }
  }

  /**
   * Sets the playback speed.
   * @param rate Playback rate (1.0 is normal speed).
   */
  public setPlaybackRate(rate: number) {
    this.videoElement.playbackRate = rate;
  }

  /**
   * Sets whether the video should loop.
   * @param loop True to loop, false otherwise.
   */
  public setLoop(loop: boolean) {
    this.videoElement.loop = loop;
  }

  /**
   * Sets the volume.
   * @param volume Volume level from 0.0 to 1.0.
   */
  public setVolume(volume: number) {
    this.videoElement.volume = Math.max(0, Math.min(volume, 1));
  }

  /**
   * Mutes or unmutes the video.
   * @param muted True to mute, false to unmute.
   */
  public setMuted(muted: boolean) {
    this.videoElement.muted = muted;
  }

  /**
   * Gets the current playback time.
   */
  public getCurrentTime(): number {
    return this.videoElement.currentTime;
  }

  /**
   * Gets the video duration.
   */
  public getDuration(): number {
    return this.videoElement.duration;
  }
  
  /**
   * Returns the underlying video element.
   */
  public getElement(): HTMLVideoElement {
    return this.videoElement;
  }

  public destroy() {
    if (this.fileInput && this.fileInput.parentNode) {
      this.fileInput.parentNode.removeChild(this.fileInput);
      this.fileInput = null;
    }
    if (this.videoElement.src && this.videoElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.videoElement.src);
      this.videoElement.removeAttribute('src');
    }
  }
}

// Keep the original function name as an entry point if desired, or replace usage.
// Assuming the user wants to use this file to handle input.
export function handleInput(videoId: string): FMP4Receiver {
  return new FMP4Receiver(videoId);
}
