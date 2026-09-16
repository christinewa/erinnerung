import {
  EffectComposer, RenderPass, EffectPass,
  NoiseEffect, VignetteEffect, BrightnessContrastEffect, SMAAEffect, BlendFunction,
} from 'postprocessing';

export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer, { multisampling: 0 });
  composer.addPass(new RenderPass(scene, camera));

  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
  noise.blendMode.opacity.value = 0.32;
  const vignette = new VignetteEffect({ offset: 0.22, darkness: 0.7 });
  const bc = new BrightnessContrastEffect({ brightness: 0.0, contrast: 0.22 });
  const smaa = new SMAAEffect();

  composer.addPass(new EffectPass(camera, smaa, bc, noise, vignette));
  return { composer, noise, vignette, bc };
}
