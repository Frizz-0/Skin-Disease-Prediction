import * as ort from 'onnxruntime-web';

export async function runInference(imageElement: HTMLVideoElement) {
    // 1. Load the model from your /public folder
    const session = await ort.InferenceSession.create('X:\Python\ML\Projects\Skin_disease\Skin_Disease_Prediction\frontend\public\models\model.onnx', { 
        executionProviders: ['webgl'] // Use the phone's GPU!
    });

    // 2. Pre-process Image (Resize to 224x224 and Normalize)
    // NOTE: You'll need a helper function here to get pixel data
    const inputTensor = await preprocessImage(imageElement);

    // 3. Run Inference
    const feeds = { input: inputTensor };
    const results = await session.run(feeds);

    return {
        disease_logits: results.disease_output.data,
        skin_logits: results.skin_output.data
    };
}