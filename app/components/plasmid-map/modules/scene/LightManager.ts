import * as THREE from 'three';

interface LightPreset {
  ambient: {
    color: number;
    intensity: number;
  };
  directional: {
    color: number;
    intensity: number;
    position: THREE.Vector3;
  }[];
  point?: {
    color: number;
    intensity: number;
    position: THREE.Vector3;
    distance?: number;
    decay?: number;
  }[];
}

export class LightManager {
  private scene: THREE.Scene;
  private lights: {
    ambient?: THREE.AmbientLight;
    directional: THREE.DirectionalLight[];
    point: THREE.PointLight[];
  };

  private presets: { [key: string]: LightPreset } = {
    default: {
      ambient: {
        color: 0xffffff,
        intensity: 0.6
      },
      directional: [
        {
          color: 0xffffff,
          intensity: 0.8,
          position: new THREE.Vector3(10, 10, 10)
        }
      ]
    },
    dramatic: {
      ambient: {
        color: 0x2c3e50,
        intensity: 0.3
      },
      directional: [
        {
          color: 0xecf0f1,
          intensity: 1.2,
          position: new THREE.Vector3(-10, 20, 10)
        }
      ],
      point: [
        {
          color: 0xe74c3c,
          intensity: 1.0,
          position: new THREE.Vector3(5, 0, 5),
          distance: 20,
          decay: 2
        }
      ]
    },
    soft: {
      ambient: {
        color: 0xffffff,
        intensity: 0.8
      },
      directional: [
        {
          color: 0xffffff,
          intensity: 0.4,
          position: new THREE.Vector3(5, 5, 5)
        },
        {
          color: 0xffffff,
          intensity: 0.2,
          position: new THREE.Vector3(-5, -5, -5)
        }
      ]
    },
    scientific: {
      ambient: {
        color: 0xf0f0f0,
        intensity: 0.7
      },
      directional: [
        {
          color: 0xffffff,
          intensity: 0.6,
          position: new THREE.Vector3(10, 10, 10)
        },
        {
          color: 0xf0f0f0,
          intensity: 0.3,
          position: new THREE.Vector3(-10, -10, -10)
        }
      ],
      point: [
        {
          color: 0x00ff00,
          intensity: 0.5,
          position: new THREE.Vector3(0, 5, 0),
          distance: 15,
          decay: 2
        }
      ]
    }
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lights = {
      directional: [],
      point: []
    };
    this.setPreset('default');
  }

  public setPreset(presetName: string) {
    const preset = this.presets[presetName];
    if (!preset) {
      console.warn(`Lighting preset '${presetName}' not found, using default`);
      return;
    }

    this.clearLights();

    // Add ambient light
    if (preset.ambient) {
      this.lights.ambient = new THREE.AmbientLight(
        preset.ambient.color,
        preset.ambient.intensity
      );
      this.scene.add(this.lights.ambient);
    }

    // Add directional lights
    preset.directional.forEach(light => {
      const directionalLight = new THREE.DirectionalLight(
        light.color,
        light.intensity
      );
      directionalLight.position.copy(light.position);
      this.lights.directional.push(directionalLight);
      this.scene.add(directionalLight);
    });

    // Add point lights
    if (preset.point) {
      preset.point.forEach(light => {
        const pointLight = new THREE.PointLight(
          light.color,
          light.intensity,
          light.distance,
          light.decay
        );
        pointLight.position.copy(light.position);
        this.lights.point.push(pointLight);
        this.scene.add(pointLight);
      });
    }
  }

  public addCustomLight(
    type: 'ambient' | 'directional' | 'point',
    options: {
      color?: number;
      intensity?: number;
      position?: THREE.Vector3;
      distance?: number;
      decay?: number;
    }
  ) {
    let light: THREE.Light;

    switch (type) {
      case 'ambient':
        light = new THREE.AmbientLight(
          options.color || 0xffffff,
          options.intensity || 1.0
        );
        this.lights.ambient = light as THREE.AmbientLight;
        break;

      case 'directional':
        light = new THREE.DirectionalLight(
          options.color || 0xffffff,
          options.intensity || 1.0
        );
        if (options.position) {
          light.position.copy(options.position);
        }
        this.lights.directional.push(light as THREE.DirectionalLight);
        break;

      case 'point':
        light = new THREE.PointLight(
          options.color || 0xffffff,
          options.intensity || 1.0,
          options.distance,
          options.decay
        );
        if (options.position) {
          light.position.copy(options.position);
        }
        this.lights.point.push(light as THREE.PointLight);
        break;

      default:
        throw new Error(`Unsupported light type: ${type}`);
    }

    this.scene.add(light);
    return light;
  }

  public updateLightIntensities(intensityFactor: number) {
    if (this.lights.ambient) {
      this.lights.ambient.intensity *= intensityFactor;
    }

    this.lights.directional.forEach(light => {
      light.intensity *= intensityFactor;
    });

    this.lights.point.forEach(light => {
      light.intensity *= intensityFactor;
    });
  }

  public animateLights(duration: number = 1000) {
    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      this.lights.point.forEach((light, index) => {
        const angle = (progress * Math.PI * 2) + (index * Math.PI / 2);
        const radius = 10;
        light.position.x = Math.cos(angle) * radius;
        light.position.z = Math.sin(angle) * radius;
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  public clearLights() {
    if (this.lights.ambient) {
      this.scene.remove(this.lights.ambient);
      this.lights.ambient = undefined;
    }

    this.lights.directional.forEach(light => {
      this.scene.remove(light);
    });
    this.lights.directional = [];

    this.lights.point.forEach(light => {
      this.scene.remove(light);
    });
    this.lights.point = [];
  }

  public dispose() {
    this.clearLights();
  }
} 