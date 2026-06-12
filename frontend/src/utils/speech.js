// Cross-browser speech recognition definition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export class SpeechHandler {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.customAccent = ''; // 'us' | 'gb' | 'au' etc.
    this.customSpeed = 1.0; // 0.5 to 2.0
  }

  // Set the current English level of the user (affects TTS speed and voice)
  setLevel(level) {
    this.level = level;
  }

  setCustomVoiceSettings(accent, speed) {
    this.customAccent = accent || '';
    this.customSpeed = speed ? Number(speed) : 1.0;
  }

  // Start speech recognition
  startListening({ onResult, onStart, onEnd, onError }) {
    if (!this.recognition) {
      if (onError) onError('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    }

    this.recognition.onstart = () => {
      this.isListening = true;
      if (onStart) onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (onResult) {
        onResult({
          text: finalTranscript || interimTranscript,
          isFinal: finalTranscript !== ''
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (onError) onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
    }
  }

  // Stop speech recognition
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  // Speak text using browser SpeechSynthesis
  speak(text, { onStart, onEnd } = {}) {
    if (!this.synthesis) return;

    // Cancel any active speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose a high-quality English voice if available
    const voices = this.synthesis.getVoices();
    let selectedVoice = null;
    
    if (this.customAccent) {
      const accentCodes = {
        us: 'en-US',
        gb: 'en-GB',
        au: 'en-AU',
        ca: 'en-CA',
        in: 'en-IN'
      };
      const code = accentCodes[this.customAccent.toLowerCase()] || 'en-US';
      selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(code.toLowerCase()) && v.name.includes('Google')) ||
                      voices.find(v => v.lang.toLowerCase().startsWith(code.toLowerCase()));
    }

    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('en-US') && v.name.includes('Google'));
    }
    
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('en-GB') || v.lang.startsWith('en-'));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Set custom or level-based rate
    if (this.customSpeed && this.customSpeed !== 1.0) {
      utterance.rate = this.customSpeed;
    } else {
      // Adjust rate based on English proficiency level
      if (this.level === 'beginner') {
        utterance.rate = 0.8; // Slower for easier comprehension
      } else if (this.level === 'intermediate') {
        utterance.rate = 0.95;
      } else {
        utterance.rate = 1.1; // Advanced: natural native-like speed
      }
    }
    utterance.pitch = 1.0;

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;

    this.synthesis.speak(utterance);
  }

  // Cancel any active speech synthesis
  cancelSpeak() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

// Export single instance
export const speechHandler = new SpeechHandler();
