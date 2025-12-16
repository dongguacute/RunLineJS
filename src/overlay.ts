import * as THREE from 'three';
import { Renderer } from './render';

export class RaceOverlay {
  private scene: THREE.Scene;
  private lanesGroup: THREE.Group;
  private rankingsGroup: THREE.Group;
  private laneCount: number = 8;
  private laneWidth: number = 1.22; // Standard track lane width in meters
  private trackLength: number = 100; // Display length
  private cardOrientation: 'flat' | 'upright' = 'flat';
  private cardStyle: 'classic' | 'modern' | 'neon' = 'classic';
  private revealEffect: 'static' | 'fade' | 'slide' | 'scale' = 'static';
  private cardOffsetX: number = 0;
  private animations: { mesh: THREE.Mesh, type: string, startTime: number, duration: number, startProp: any, endProp: any }[] = [];

  constructor(renderer: Renderer) {
    this.scene = renderer.scene;
    this.lanesGroup = new THREE.Group();
    this.rankingsGroup = new THREE.Group();
    
    this.scene.add(this.lanesGroup);
    this.scene.add(this.rankingsGroup);

    // Default setup
    this.createLanes();
    
    // Register update loop
    renderer.onUpdate.push(this.update.bind(this));
  }

  /**
   * Sets the visual style of the ranking cards.
   * @param style 'classic', 'modern', or 'neon'
   */
  public setCardStyle(style: 'classic' | 'modern' | 'neon') {
    this.cardStyle = style;
  }

  /**
   * Sets the reveal animation effect.
   * @param effect 'static', 'fade', 'slide', or 'scale'
   */
  public setRevealEffect(effect: 'static' | 'fade' | 'slide' | 'scale') {
    this.revealEffect = effect;
  }

  /**
   * Sets the global position offset for all ranking cards.
   * @param x Offset along the track (Longitudinal)
   */
  public setCardOffset(x: number) {
    this.cardOffsetX = x;
    this.updateCardPositions();
  }

  private update() {
    const now = performance.now();
    
    // Process animations
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const anim = this.animations[i];
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      if (anim.type === 'fade') {
        if (Array.isArray(anim.mesh.material)) {
            anim.mesh.material.forEach(m => {
                if (m instanceof THREE.Material) m.opacity = anim.startProp + (anim.endProp - anim.startProp) * eased;
            });
        } else if (anim.mesh.material instanceof THREE.Material) {
            anim.mesh.material.opacity = anim.startProp + (anim.endProp - anim.startProp) * eased;
        }
      } else if (anim.type === 'slide') {
        anim.mesh.position.y = anim.startProp + (anim.endProp - anim.startProp) * eased;
      } else if (anim.type === 'scale') {
        const s = anim.startProp + (anim.endProp - anim.startProp) * eased;
        anim.mesh.scale.set(s, s, s);
      }

      if (progress >= 1) {
        this.animations.splice(i, 1);
      }
    }
  }

  /**
   * Configures the track layout.
   * @param count Number of lanes
   * @param width Width of each lane in meters
   * @param length Length of the track segment to visualize
   */
  public configureTrack(count: number, width: number, length: number) {
    this.laneCount = count;
    this.laneWidth = width;
    this.trackLength = length;
    
    this.createLanes();
    
    // Update existing rankings size and position
    const laneSpan = Math.max(0.5, this.laneWidth - 0.3);
    const trackSpan = laneSpan * 4;

    this.rankingsGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        // Update Geometry
        if (child.geometry) child.geometry.dispose();
        child.geometry = new THREE.PlaneGeometry(trackSpan, laneSpan);
      }
    });

    this.updateCardPositions();
  }

  private updateCardPositions() {
    this.rankingsGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        const laneIndex = child.userData.laneIndex;
        if (typeof laneIndex === 'number') {
          // Base Z based on lane
          const baseZ = (laneIndex * this.laneWidth) - (this.laneCount * this.laneWidth / 2) + (this.laneWidth / 2);
          
          child.position.x = 0 + this.cardOffsetX;
          child.position.y = 0.02;
          child.position.z = baseZ;
        }
      }
    });
  }

  /**
   * Sets the orientation of the ranking cards.
   * @param orientation 'flat' (on ground) or 'upright' (facing camera)
   */
  public setCardOrientation(orientation: 'flat' | 'upright') {
    this.cardOrientation = orientation;
    
    // Update existing cards
    this.rankingsGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        if (orientation === 'flat') {
           child.rotation.x = -Math.PI / 2;
           child.rotation.y = 0;
        } else {
           child.rotation.x = 0;
           child.rotation.y = -Math.PI / 2; // Face towards positive X (assuming camera is at +X)
        }
      }
    });
  }

  private createLanes() {
    // Clear existing lanes
    while(this.lanesGroup.children.length > 0){ 
      const child = this.lanesGroup.children[0];
      this.lanesGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });

    // Draw lines between lanes
    for (let i = 0; i <= this.laneCount; i++) {
      const z = (i * this.laneWidth) - (this.laneCount * this.laneWidth / 2);
      
      const points = [];
      points.push(new THREE.Vector3(-this.trackLength / 2, 0, z));
      points.push(new THREE.Vector3(this.trackLength / 2, 0, z));

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      this.lanesGroup.add(line);
    }
  }

  // Removed or Commented out to avoid confusion with video finish line
  /*
  private createFinishLine() {
    // ...
  }
  */

  /**
   * Displays a ranking marker for an athlete.
   * @param laneIndex 0-based lane index
   * @param rank The rank (1, 2, 3...)
   * @param athleteName Name of the athlete
   * @param time Finish time string
   * @param imageBase64 Optional base64 image string for the athlete
   */
  public showRank(laneIndex: number, rank: number, athleteName: string, time: string, imageBase64?: string) {
    if (laneIndex < 0 || laneIndex >= this.laneCount) return;

    // Calculate position: Center of the lane, at the finish line (x=0)
    const baseZ = (laneIndex * this.laneWidth) - (this.laneCount * this.laneWidth / 2) + (this.laneWidth / 2);
    
    // Create a label
    const label = this.createLabel(rank, athleteName, time, imageBase64);
    
    // Position it with offsets
    const targetY = 0.02;
    label.position.set(
        0 + this.cardOffsetX, 
        targetY, 
        baseZ
    ); 
    label.userData = { laneIndex };

    // Apply Reveal Effect
    if (this.revealEffect === 'fade') {
        // Start transparent
        if (label instanceof THREE.Mesh) {
             if (Array.isArray(label.material)) {
                 label.material.forEach(m => m.opacity = 0);
             } else {
                 label.material.opacity = 0;
             }
             this.animations.push({
                 mesh: label,
                 type: 'fade',
                 startTime: performance.now(),
                 duration: 1000,
                 startProp: 0,
                 endProp: 1
             });
        }
    } else if (this.revealEffect === 'slide') {
        // Start below ground
        label.position.y = -5;
        if (label instanceof THREE.Mesh) {
             this.animations.push({
                 mesh: label,
                 type: 'slide',
                 startTime: performance.now(),
                 duration: 800,
                 startProp: -5,
                 endProp: targetY
             });
        }
    } else if (this.revealEffect === 'scale') {
        // Start small
        label.scale.set(0, 0, 0);
        if (label instanceof THREE.Mesh) {
             this.animations.push({
                 mesh: label,
                 type: 'scale',
                 startTime: performance.now(),
                 duration: 600,
                 startProp: 0,
                 endProp: 1
             });
        }
    }
    
    this.rankingsGroup.add(label);
  }

  private createLabel(rank: number, name: string, time: string, imageBase64?: string): THREE.Object3D {
    // Using CanvasTexture for dynamic text without external font files
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Object3D();

    // Make the card longer (4:1 ratio instead of 2:1)
    const width = 1024;
    const height = 256;
    canvas.width = width;
    canvas.height = height;

    // Background
    if (this.cardStyle === 'modern') {
        // Modern: White/Light background, rounded corners
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.roundRect(0, 0, width, height, 40);
        ctx.fill();
        
        // Shadow effect (inner)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
    } else if (this.cardStyle === 'neon') {
        // Neon: Dark background, glowing border
        ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
        ctx.fillRect(0, 0, width, height);
        
        // Glow
        ctx.shadowColor = rank === 1 ? '#FFD700' : (rank === 2 ? '#C0C0C0' : (rank === 3 ? '#CD7F32' : '#00FFFF'));
        ctx.shadowBlur = 30;
    } else {
        // Classic: Dark background, slight round
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.roundRect(0, 0, width, height, 20);
        ctx.fill();
    }
    
    // Reset shadow for text/content
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Border color based on rank
    ctx.lineWidth = this.cardStyle === 'neon' ? 15 : 10;
    if (rank === 1) ctx.strokeStyle = '#FFD700'; // Gold
    else if (rank === 2) ctx.strokeStyle = '#C0C0C0'; // Silver
    else if (rank === 3) ctx.strokeStyle = '#CD7F32'; // Bronze
    else ctx.strokeStyle = this.cardStyle === 'modern' ? '#333333' : '#FFFFFF';
    
    if (this.cardStyle !== 'modern') {
       ctx.stroke();
    } else {
       // Modern might not need full border, maybe just a left accent bar
       ctx.beginPath();
       ctx.moveTo(20, 0);
       ctx.lineTo(20, height);
       ctx.lineWidth = 40;
       ctx.stroke();
    }

    // Text & Layout
    ctx.fillStyle = this.cardStyle === 'modern' ? '#333333' : '#FFFFFF';
    
    const textStartX = imageBase64 ? 300 : 60; // Shift text right if image exists
    const centerY = height / 2;

    // Draw Image if provided
    if (imageBase64) {
      const img = new Image();
      img.onload = () => {
        // Draw image in a square/rect (User Request: "Not circular")
        const size = 200;
        const x = 30;
        const y = (height - size) / 2;

        ctx.save();
        
        // Optional: Rounded corners for image if Modern style
        if (this.cardStyle === 'modern') {
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, 20);
            ctx.clip();
        } else {
            // Square/Rect for Classic/Neon as requested (or just slight round)
            // Just raw square
            ctx.beginPath();
            ctx.rect(x, y, size, size);
            ctx.clip();
        }
        
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
        
        // Update texture
        if (material.map) material.map.needsUpdate = true;
      };
      img.src = imageBase64;
    }

    // Rank
    ctx.textAlign = 'left';
    ctx.font = this.cardStyle === 'neon' ? 'bold 100px Courier New' : 'bold 100px Arial';
    ctx.fillText(`${rank}`, textStartX, centerY + 30);

    // Name
    ctx.textAlign = 'left';
    ctx.font = this.cardStyle === 'neon' ? 'bold 70px Courier New' : 'bold 70px Arial';
    ctx.fillText(name, textStartX + 120, centerY - 20);

    // Time
    ctx.font = this.cardStyle === 'neon' ? '50px Courier New' : '50px Arial';
    ctx.fillText(time, textStartX + 120, centerY + 50);

    const texture = new THREE.CanvasTexture(canvas);
    // Use DoubleSide so it's visible from both sides
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
    
    // Create a flat "carpet" on the ground
    
    // 1. Determine "Lane Span" (World Z dimension)
    const laneSpan = Math.max(0.5, this.laneWidth - 0.3);
    
    // 2. Determine "Track Span" (World X dimension) based on texture aspect ratio
    // Texture is 1024 (w) x 256 (h) => 4:1 ratio
    // If texture 'h' maps to laneSpan, then texture 'w' should map to laneSpan * 4
    // This makes the card longer along the track
    const trackSpan = laneSpan * 4;

    // Create Plane geometry (width, height)
    const geometry = new THREE.PlaneGeometry(trackSpan, laneSpan);
    const mesh = new THREE.Mesh(geometry, material);

    // Orientation logic
    if (this.cardOrientation === 'flat') {
        mesh.rotation.x = -Math.PI / 2;
    } else {
        // Upright, facing the finish line camera (assumed at +X looking at -X, or similar)
        // If track is along X, and finish is at X=0.
        // If we want it to face "Side", it would be different.
        // Assuming "Upright" means billboard style facing Side Camera (Z)
        // Or facing Finish Camera (X).
        // Let's assume Side Camera for now based on "Oblique" request.
        // If camera is at Z=20, looking at Z=0.
        // Card plane should be in XY plane.
        // Default PlaneGeometry is in XY plane.
        // So rotation (0,0,0) makes it face Z.
        mesh.rotation.set(0, 0, 0); 
        
        // However, if we want it aligned with the track direction but standing up:
        // Track runs along X. Card length is along X.
        // So it should be in XZ plane (Flat) or XY plane (Standing up facing Z)?
        // Yes, standing up facing Z (Side View).
    }
    
    return mesh;
  }

  public clearRankings() {
    while(this.rankingsGroup.children.length > 0){ 
      const child = this.rankingsGroup.children[0];
      this.rankingsGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }

  public updateCamera(position: {x: number, y: number, z: number}, lookAt: {x: number, y: number, z: number}) {
     // Helper for camera manipulation if needed
  }
}
