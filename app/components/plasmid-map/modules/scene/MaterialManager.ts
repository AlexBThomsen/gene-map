import * as THREE from 'three';

interface MaterialPreset {
  type: 'standard' | 'physical' | 'toon' | 'custom';
  properties: {
    color?: number;
    metalness?: number;
    roughness?: number;
    transparent?: boolean;
    opacity?: number;
    emissive?: number;
    emissiveIntensity?: number;
    wireframe?: boolean;
  };
  shader?: {
    vertex: string;
    fragment: string;
  };
}

export class MaterialManager {
  private materials: Map<string, THREE.Material>;
  private presets: { [key: string]: MaterialPreset } = {};

  constructor() {
    this.materials = new Map();
    this.initializePresets();
  }

  private initializePresets() {
    this.presets = {
      dnaBackbone: {
        type: 'physical',
        properties: {
          color: 0x2c3e50,
          metalness: 0.8,
          roughness: 0.2,
          transparent: false
        }
      },
      basePair: {
        type: 'standard',
        properties: {
          color: 0x3498db,
          metalness: 0.5,
          roughness: 0.5,
          transparent: true,
          opacity: 0.8
        }
      },
      feature: {
        type: 'standard',
        properties: {
          color: 0xe74c3c,
          metalness: 0.3,
          roughness: 0.7,
          transparent: true,
          opacity: 0.7,
          emissive: 0xe74c3c,
          emissiveIntensity: 0.2
        }
      },
      highlight: {
        type: 'standard',
        properties: {
          color: 0xf1c40f,
          metalness: 0.4,
          roughness: 0.6,
          transparent: true,
          opacity: 0.9,
          emissive: 0xf1c40f,
          emissiveIntensity: 0.5
        }
      },
      wireframe: {
        type: 'standard',
        properties: {
          color: 0xecf0f1,
          wireframe: true,
          transparent: true,
          opacity: 0.5
        }
      },
      glowing: {
        type: 'custom',
        properties: {
          color: 0x2ecc71,
          transparent: true,
          opacity: 0.8
        },
        shader: {
          vertex: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragment: `
            uniform vec3 color;
            uniform float opacity;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
              float intensity = pow(0.8 - dot(vNormal, normalize(vPosition)), 2.0);
              gl_FragColor = vec4(color, opacity) * intensity;
            }
          `
        }
      }
    };
  }

  public createMaterial(presetName: string, customProperties: Partial<MaterialPreset['properties']> = {}): THREE.Material {
    const preset = this.presets[presetName];
    if (!preset) {
      console.warn(`Material preset '${presetName}' not found, using default`);
      return new THREE.MeshStandardMaterial({ color: 0xcccccc });
    }

    let material: THREE.Material;

    switch (preset.type) {
      case 'physical':
        material = new THREE.MeshPhysicalMaterial({
          ...preset.properties,
          ...customProperties
        });
        break;

      case 'toon':
        material = new THREE.MeshToonMaterial({
          ...preset.properties,
          ...customProperties
        });
        break;

      case 'custom':
        if (preset.shader) {
          material = new THREE.ShaderMaterial({
            uniforms: {
              color: { value: new THREE.Color(preset.properties.color || 0xffffff) },
              opacity: { value: preset.properties.opacity || 1.0 }
            },
            vertexShader: preset.shader.vertex,
            fragmentShader: preset.shader.fragment,
            transparent: preset.properties.transparent
          });
        } else {
          material = new THREE.MeshStandardMaterial({
            ...preset.properties,
            ...customProperties
          });
        }
        break;

      default:
        material = new THREE.MeshStandardMaterial({
          ...preset.properties,
          ...customProperties
        });
    }

    const materialId = `${presetName}-${Date.now()}`;
    this.materials.set(materialId, material);
    return material;
  }

  public updateMaterial(material: THREE.Material, properties: Partial<MaterialPreset['properties']>) {
    if (material instanceof THREE.ShaderMaterial) {
      if (properties.color !== undefined) {
        material.uniforms.color.value = new THREE.Color(properties.color);
      }
      if (properties.opacity !== undefined) {
        material.uniforms.opacity.value = properties.opacity;
      }
    } else {
      Object.assign(material, properties);
    }
    material.needsUpdate = true;
  }

  public createGradientMaterial(colors: number[], stops: number[] = []): THREE.ShaderMaterial {
    const colorStrings = colors.map(c => {
      const color = new THREE.Color(c);
      return `vec3(${color.r.toFixed(4)}, ${color.g.toFixed(4)}, ${color.b.toFixed(4)})`;
    });

    const actualStops = stops.length === colors.length ? stops : colors.map((_, i) => i / (colors.length - 1));

    const shader = {
      uniforms: {
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying float vPosition;
        
        void main() {
          vPosition = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying float vPosition;
        
        void main() {
          vec3 color;
          float t = (vPosition + 1.0) * 0.5;  // Normalize to [0,1]
          
          ${this.generateGradientLogic(colorStrings, actualStops)}
          
          gl_FragColor = vec4(color, opacity);
        }
      `
    };

    return new THREE.ShaderMaterial(shader);
  }

  private generateGradientLogic(colors: string[], stops: number[]): string {
    let code = '';
    for (let i = 0; i < colors.length - 1; i++) {
      if (i === 0) {
        code += `if (t < ${stops[i + 1].toFixed(4)}) {\n`;
      } else {
        code += `else if (t < ${stops[i + 1].toFixed(4)}) {\n`;
      }
      code += `  float gradientT = (t - ${stops[i].toFixed(4)}) / (${stops[i + 1].toFixed(4)} - ${stops[i].toFixed(4)});\n`;
      code += `  color = mix(${colors[i]}, ${colors[i + 1]}, gradientT);\n`;
      code += `}\n`;
    }
    code += `else {\n  color = ${colors[colors.length - 1]};\n}`;
    return code;
  }

  public createPulsingMaterial(baseColor: number, pulseColor: number, duration: number = 1.0): THREE.ShaderMaterial {
    const baseColorObj = new THREE.Color(baseColor);
    const pulseColorObj = new THREE.Color(pulseColor);

    return new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: new THREE.Vector3(baseColorObj.r, baseColorObj.g, baseColorObj.b) },
        pulseColor: { value: new THREE.Vector3(pulseColorObj.r, pulseColorObj.g, pulseColorObj.b) },
        time: { value: 0.0 },
        duration: { value: duration },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 pulseColor;
        uniform float time;
        uniform float duration;
        uniform float opacity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float pulse = (sin(time * 6.28318 / duration) + 1.0) * 0.5;
          vec3 finalColor = mix(baseColor, pulseColor, pulse);
          float intensity = pow(0.8 - dot(vNormal, normalize(vPosition)), 2.0);
          gl_FragColor = vec4(finalColor * intensity, opacity);
        }
      `,
      transparent: true
    });
  }

  public updatePulsingMaterial(material: THREE.ShaderMaterial, time: number) {
    material.uniforms.time.value = time;
  }

  public dispose() {
    this.materials.forEach(material => {
      material.dispose();
    });
    this.materials.clear();
  }
} 