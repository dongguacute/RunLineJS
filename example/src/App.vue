<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount, watch } from 'vue';
import { Renderer, RaceOverlay } from '../../src/index';

const containerRef = ref<HTMLDivElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
let renderer: Renderer | null = null;
let overlay: RaceOverlay | null = null;

// Camera Controls (6-DOF)
const camPosX = ref(0);
const camPosY = ref(10);
const camPosZ = ref(20);
const camRotX = ref(-0.5);
const camRotY = ref(0);
const camRotZ = ref(0);

// Lane Settings
const laneSpacing = ref(1.22); // Lane Width

// Input Form
const athleteName = ref('Bolt');
const finishTime = ref('9.58');
const laneIndex = ref(4);
const rank = ref(1);
const athleteImage = ref<string | undefined>(undefined);
const cardOrientation = ref<'flat' | 'upright'>('flat');
const cardStyle = ref<'classic' | 'modern' | 'neon'>('classic');
const revealEffect = ref<'static' | 'fade' | 'slide' | 'scale'>('static');
const cameraView = ref<'oblique' | 'vertical'>('oblique');

onMounted(() => {
  if (containerRef.value) {
    // Initialize Renderer
    renderer = new Renderer(containerRef.value.id);
    
    // Initialize Overlay
    overlay = new RaceOverlay(renderer);
    
    // Initial Camera Setup
    updateCamera();
    updateCardOrientation();
    updateCardStyle();
    updateRevealEffect();
  }
});

onBeforeUnmount(() => {
  if (renderer) {
    renderer.destroy();
  }
});

const updateCamera = () => {
  if (renderer) {
    renderer.camera.position.set(camPosX.value, camPosY.value, camPosZ.value);
    renderer.camera.rotation.set(camRotX.value, camRotY.value, camRotZ.value);
  }
};

const updateTrackConfig = () => {
  if (overlay) {
    // Reconfigure track with new lane width
    overlay.configureTrack(8, laneSpacing.value, 100);
  }
};

const updateCardOrientation = () => {
  if (overlay) {
    overlay.setCardOrientation(cardOrientation.value);
  }
};

const updateCardStyle = () => {
  if (overlay) {
    overlay.setCardStyle(cardStyle.value);
  }
};

const updateRevealEffect = () => {
  if (overlay) {
    overlay.setRevealEffect(revealEffect.value);
  }
};

const updateCameraView = () => {
  if (cameraView.value === 'vertical') {
    // Top-down view
    camPosX.value = 0;
    camPosY.value = 40;
    camPosZ.value = 0;
    camRotX.value = -1.57; // -90 degrees
    camRotY.value = 0;
    camRotZ.value = -1.57; // Rotate to make track vertical on screen if desired, or 0 for horizontal
    // Let's stick to 0 for horizontal track first, or maybe the user implies "Vertical" as "Track runs vertically"?
    // "Vertical refers to camera shooting from vertical angle" -> Top Down.
    // Usually track is long. If screen is 16:9, horizontal track fits better.
    // But if they want "Vertical", maybe they mean Top Down.
    camRotZ.value = 0; 
  } else {
    // Oblique view (Default)
    camPosX.value = 0;
    camPosY.value = 10;
    camPosZ.value = 20;
    camRotX.value = -0.5;
    camRotY.value = 0;
    camRotZ.value = 0;
  }
  updateCamera();
};

// Watch for lane spacing changes to update track geometry in real-time
watch(laneSpacing, () => {
  updateTrackConfig();
});

watch(cardOrientation, () => {
  updateCardOrientation();
});

watch(cardStyle, () => {
  updateCardStyle();
});

watch(revealEffect, () => {
  updateRevealEffect();
});

watch(cameraView, () => {
  updateCameraView();
});

const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        athleteImage.value = e.target.result as string;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
};

const triggerFinish = () => {
  if (overlay) {
    overlay.showRank(laneIndex.value - 1, rank.value, athleteName.value, finishTime.value, athleteImage.value);
    // Increment rank for next input convenience
    rank.value++;
  }
};

const clearRankings = () => {
  if (overlay) overlay.clearRankings();
  rank.value = 1;
};
</script>

<template>
  <div class="app-container">
    <h1>RunLineJS Calibration</h1>
    
    <div class="viewport">
      <!-- Simulated Video Background -->
      <div class="video-background">
        <video ref="videoRef" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" autoplay muted loop playsinline></video>
        <div class="placeholder-text" style="z-index: 1; position: relative;">
          Video Stream / FMP4 Feed<br>
          (Use controls to match overlay perspective)
        </div>
      </div>

      <!-- Three.js Overlay -->
      <div id="three-container" ref="containerRef" class="overlay-container"></div>
    </div>

    <div class="controls">
      <div class="panel">
        <h3>Camera Settings</h3>
        <div class="control-group">
          <label>
            View Mode:
            <select v-model="cameraView">
              <option value="oblique">Oblique (Perspective)</option>
              <option value="vertical">Vertical (Top-Down)</option>
            </select>
          </label>
        </div>

        <h3>Camera Position</h3>
        <div class="control-group">
          <label>X: <input type="range" min="-50" max="50" step="0.1" v-model.number="camPosX" @input="updateCamera"> {{ camPosX }}</label>
          <label>Y: <input type="range" min="1" max="50" step="0.1" v-model.number="camPosY" @input="updateCamera"> {{ camPosY }}</label>
          <label>Z: <input type="range" min="-50" max="100" step="0.1" v-model.number="camPosZ" @input="updateCamera"> {{ camPosZ }}</label>
        </div>
        
        <h3>Camera Rotation</h3>
        <div class="control-group">
          <label>Pitch (X): <input type="range" min="-3.14" max="3.14" step="0.01" v-model.number="camRotX" @input="updateCamera"> {{ camRotX }}</label>
          <label>Yaw (Y): <input type="range" min="-3.14" max="3.14" step="0.01" v-model.number="camRotY" @input="updateCamera"> {{ camRotY }}</label>
          <label>Roll (Z): <input type="range" min="-3.14" max="3.14" step="0.01" v-model.number="camRotZ" @input="updateCamera"> {{ camRotZ }}</label>
        </div>
      </div>

      <div class="panel">
        <h3>Track Calibration</h3>
        <div class="control-group">
          <label>Lane Width: <input type="range" min="0.5" max="3.0" step="0.01" v-model.number="laneSpacing"> {{ laneSpacing }}m</label>
        </div>

        <h3>Card Settings</h3>
        <div class="control-group">
          <label>
            Orientation:
            <select v-model="cardOrientation">
              <option value="flat">Flat (Ground)</option>
              <option value="upright">Upright (Camera Facing)</option>
            </select>
          </label>
          <label>
            Style:
            <select v-model="cardStyle">
              <option value="classic">Classic</option>
              <option value="modern">Modern</option>
              <option value="neon">Neon</option>
            </select>
          </label>
          <label>
            Reveal Effect:
            <select v-model="revealEffect">
              <option value="static">Static (None)</option>
              <option value="fade">Fade In</option>
              <option value="slide">Slide Up</option>
              <option value="scale">Scale Up</option>
            </select>
          </label>
        </div>

        <h3>Test Controls</h3>
        <div class="input-group">
          <input v-model="athleteName" placeholder="Name">
          <input v-model="finishTime" placeholder="Time">
          <input type="number" v-model.number="laneIndex" placeholder="Lane (1-8)" min="1" max="8">
          
          <label>Athlete Image (Upload):</label>
          <input type="file" accept="image/*" @change="handleImageUpload">
          <div v-if="athleteImage" class="image-preview">
            <img :src="athleteImage" alt="Preview" style="height: 50px;">
          </div>

          <button @click="triggerFinish">Simulate Finish (Add Card)</button>
        </div>
        <button @click="clearRankings" class="clear-btn">Clear Rankings</button>
      </div>
    </div>
  </div>
</template>

<style>
body, html, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden;
}
</style>

<style scoped>
.app-container {
  font-family: Arial, sans-serif;
  width: 100%;
  margin: 0;
  padding: 10px;
  box-sizing: border-box;
}

.viewport {
  position: relative;
  width: 100%;
  /* Remove aspect-ratio to allow filling screen or using height */
  aspect-ratio: 16 / 9;
  max-height: 80vh; /* Limit height so controls are visible */
  margin: 0 auto 20px;
  border: 2px solid #333;
  background: #000;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

.video-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, #222, #444);
  z-index: 0;
}

.placeholder-text {
  position: absolute;
  top: 10px;
  left: 10px;
  color: #aaa;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
  pointer-events: none;
}

.overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.panel {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
}

.control-group, .input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
}

input[type="range"] {
  flex-grow: 1;
  margin: 0 10px;
}

button {
  padding: 8px 16px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

button:hover {
  background: #3aa876;
}

.clear-btn {
  background: #e74c3c;
}

.clear-btn:hover {
  background: #c0392b;
}

.image-preview {
  margin-top: 5px;
}
</style>
