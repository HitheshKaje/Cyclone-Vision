/**
 * CycloSafe Emergency Siren Audio Service (Web Audio API)
 * Synthesizes an authentic mechanical coastal foghorn / emergency warning siren.
 * Operates 100% offline with zero external audio asset dependencies.
 * Handles mobile browser autoplay permissions by unlocking on user interaction.
 */

class SirenService {
  constructor() {
    this.audioCtx = null;
    this.gainNode = null;
    this.oscillator = null;
    this.pitchInterval = null;
    this.vibrationInterval = null;
    this.isPlaying = false;
    this.volume = 0.85;
    this.isArmed = false;
    this.autoArmListenerAttached = false;

    // Attach passive auto-arm on first touch/click on mobile devices
    if (typeof window !== 'undefined') {
      this.attachAutoArmListeners();
    }
  }

  /**
   * Automatically arm/unlock AudioContext on the very first user tap anywhere on the phone
   */
  attachAutoArmListeners() {
    if (this.autoArmListenerAttached) return;
    this.autoArmListenerAttached = true;

    const armHandler = () => {
      this.armAudio();
      // Remove once armed
      ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, armHandler);
      });
    };

    ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
      window.addEventListener(evt, armHandler, { passive: true, once: true });
    });
  }

  /**
   * Initializes and resumes the Web Audio AudioContext
   */
  armAudio() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (this.audioCtx && this.audioCtx.state === 'running') {
        this.isArmed = true;
      }
      return this.isArmed;
    } catch (e) {
      console.warn('[SirenService] Audio context arm error:', e);
      return false;
    }
  }

  /**
   * Starts synthesizing the wailing coastal warning siren
   */
  startSiren(targetVolume = 0.85) {
    if (this.isPlaying) return;

    this.armAudio();

    if (!this.audioCtx) {
      console.warn('[SirenService] AudioContext not available on this browser.');
      return;
    }

    try {
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      this.volume = targetVolume;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.volume, ctx.currentTime);
      gain.connect(ctx.destination);
      this.gainNode = gain;

      // Primary Oscillator: sawtooth waveform produces rich acoustic foghorn harmonics
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.connect(gain);
      osc.start();
      this.oscillator = osc;
      this.isPlaying = true;

      // Authentic siren modulation: rise to 850Hz, then fall to 450Hz
      let rising = true;
      this.pitchInterval = setInterval(() => {
        if (!this.oscillator || !this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        if (rising) {
          this.oscillator.frequency.exponentialRampToValueAtTime(850, now + 1.2);
        } else {
          this.oscillator.frequency.exponentialRampToValueAtTime(450, now + 1.2);
        }
        rising = !rising;
      }, 1200);

      // Trigger phone hardware vibration motor if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([600, 300, 600, 300, 900]);
        this.vibrationInterval = setInterval(() => {
          navigator.vibrate([600, 300, 600, 300, 900]);
        }, 3000);
      }

      console.info('[SirenService] Siren sound blast started successfully.');
    } catch (err) {
      console.warn('[SirenService] Siren sound start failed:', err);
    }
  }

  /**
   * Stops the acoustic siren and halts phone vibration
   */
  stopSiren() {
    if (!this.isPlaying) return;

    try {
      if (this.pitchInterval) {
        clearInterval(this.pitchInterval);
        this.pitchInterval = null;
      }

      if (this.vibrationInterval) {
        clearInterval(this.vibrationInterval);
        this.vibrationInterval = null;
      }

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(0);
      }

      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }

      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }

      this.isPlaying = false;
      console.info('[SirenService] Siren stopped.');
    } catch (err) {
      console.warn('[SirenService] Siren stop notice:', err);
      this.isPlaying = false;
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }
}

export const sirenService = new SirenService();
export default sirenService;
