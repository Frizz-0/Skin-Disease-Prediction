import { useCallback } from 'react';
import { runSkinInference, generateGradCAM, initModel } from '../lib/inference';

/**
 * Custom hook for running skin disease inference
 * Wraps the lib/inference functions with React state management
 */
export function useInference() {
  const init = useCallback(async () => {
    return await initModel();
  }, []);

  const runInference = useCallback(async (video: HTMLVideoElement) => {
    return await runSkinInference(video);
  }, []);

  const getGradCAM = useCallback(async (video: HTMLVideoElement, classIdx?: number) => {
    return await generateGradCAM(video, classIdx);
  }, []);

  return { init, runInference, getGradCAM };
}