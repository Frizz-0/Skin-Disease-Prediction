import { useEffect, useRef, useState } from 'react';
import {
    generateGradCAM,
    initModel,
    runSkinInference,
} from '../lib/inference';
import { CLASS_NAMES } from '../lib/classNames';

export interface Prediction {
    className: string;
    probability: number;
}

export function useInference() {
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [isModelReady, setIsModelReady] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);
    const [isInferring, setIsInferring] = useState(false);
    const [topPredictions, setTopPredictions] = useState<Prediction[]>([]);
    const [skinTypePrediction, setSkinTypePrediction] = useState<number | null>(null);
    const [gradCamImage, setGradCamImage] = useState<string | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        async function loadModel() {
            try {
                const session = await initModel();
                if (!session) {
                    throw new Error('Model initialization failed. Check the browser console for details.');
                }

                if (!cancelled) {
                    initializedRef.current = true;
                    setIsModelReady(true);
                    setModelError(null);
                }
            } catch (error) {
                if (!cancelled) {
                    const message = error instanceof Error ? error.message : String(error);
                    setModelError(message);
                    console.error('Failed to initialize inference model:', error);
                }
            } finally {
                if (!cancelled) setIsModelLoading(false);
            }
        }

        void loadModel();
        return () => {
            cancelled = true;
        };
    }, []);

    const runInference = async (canvas: HTMLCanvasElement) => {
        if (!initializedRef.current) {
            throw new Error(modelError || 'ONNX model session is not ready');
        }

        setIsInferring(true);
        try {
            const outputs = await runSkinInference(canvas);
            if (!outputs) {
                throw new Error('Model inference failed. Check the browser console for details.');
            }

            const outputEntries = Object.entries(outputs);
            const diseaseOutput = outputEntries.find(([name]) => name.toLowerCase().includes('disease'))
                ?? outputEntries[0];
            const skinOutput = outputEntries.find(([name]) => name.toLowerCase().includes('skin'))
                ?? outputEntries.find(([name]) => name !== diseaseOutput?.[0]);

            if (!diseaseOutput?.[1]?.data) {
                throw new Error('Model did not return disease prediction data.');
            }

            const diseaseProbabilities = softmax(diseaseOutput[1].data as Float32Array);
            const ranked = diseaseProbabilities
                .map((probability, index) => ({
                    className: CLASS_NAMES[index] || `Class ${index}`,
                    probability,
                }))
                .sort((a, b) => b.probability - a.probability)
                .slice(0, 5);

            setTopPredictions(ranked);

            if (skinOutput?.[1]?.data) {
                const skinProbabilities = softmax(skinOutput[1].data as Float32Array);
                setSkinTypePrediction(skinProbabilities.indexOf(Math.max(...skinProbabilities)) + 1);
            } else {
                setSkinTypePrediction(null);
            }

            const predictedClassIndex = diseaseProbabilities.indexOf(Math.max(...diseaseProbabilities));
            setGradCamImage(await generateGradCAM(canvas, predictedClassIndex));
        } finally {
            setIsInferring(false);
        }
    };

    return {
        runInference,
        gradCamImage,
        topPredictions,
        skinTypePrediction,
        isModelLoading,
        isModelReady,
        modelError,
        isInferring,
    };
}

function softmax(logits: Float32Array): number[] {
    const maxLogit = Math.max(...logits);
    const exponentials = Array.from(logits, (logit) => Math.exp(logit - maxLogit));
    const total = exponentials.reduce((sum, value) => sum + value, 0);
    return exponentials.map((value) => value / total);
}

export default useInference;
