/**
 * Recording Service - Handles screen and webcam recording
 */

export class RecordingService {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream = null;
  }
  
  /**
   * List available screen sources
   */
  async getScreenSources() {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      
      const sources = await window.electronAPI.getScreenSources();
      return sources;
    } catch (error) {
      console.error('Error getting screen sources:', error);
      throw error;
    }
  }
  
  /**
   * Start screen recording
   */
  async startScreenRecording(sourceId, audio = true) {
    try {
      // Request screen capture
      const videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        }
      });
      
      let combinedStream = videoStream;
      
      // Add audio if requested
      if (audio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false
          });
          
          // Combine video and audio tracks
          const audioTrack = audioStream.getAudioTracks()[0];
          combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            audioTrack
          ]);
        } catch (error) {
          console.warn('Could not access microphone, recording without audio:', error);
        }
      }
      
      // Create MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      };
      
      this.mediaRecorder = new MediaRecorder(combinedStream, options);
      this.recordedChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      this.stream = combinedStream;
      this.mediaRecorder.start(1000); // Collect data every second
      
      return true;
    } catch (error) {
      console.error('Error starting screen recording:', error);
      throw error;
    }
  }
  
  /**
   * Start webcam recording
   */
  async startWebcamRecording(audio = true) {
    try {
      const constraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        },
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000
      };
      
      this.mediaRecorder = new MediaRecorder(stream, options);
      this.recordedChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      this.stream = stream;
      this.mediaRecorder.start(1000);
      
      return true;
    } catch (error) {
      console.error('Error starting webcam recording:', error);
      throw error;
    }
  }
  
  /**
   * Stop recording
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        
        resolve({ blob, url, size: blob.size });
      };
      
      this.mediaRecorder.onerror = (event) => {
        reject(event.error);
      };
      
      this.mediaRecorder.stop();
    });
  }
  
  /**
   * Save recording to file
   */
  async saveRecording(filePath) {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    
    const { blob } = await this.stopRecording();
    
    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await window.electronAPI.saveFile(filePath, buffer);
    
    return filePath;
  }
}

export const recordingService = new RecordingService();

