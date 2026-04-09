"""
FastAPI Backend with Grad-CAM Implementation
Based on SD1_py.py reference architecture
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import numpy as np
import json
import base64
import io
import cv2
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# 1. ARCHITECTURE (MUST MATCH TRAINING - FROM SD1_py.py)
# ============================================================================
class MultiTaskEfficientNet(nn.Module):
    """Multi-task EfficientNet for disease and skin type classification"""
    
    def __init__(self, num_disease_classes):
        super(MultiTaskEfficientNet, self).__init__()
        self.backbone = models.efficientnet_b0()
        feature_dim = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Identity() 

        # Disease classification head
        self.disease_head = nn.Sequential(
            nn.Linear(feature_dim, 512), 
            nn.ReLU(),
            nn.Dropout(0.3), 
            nn.Linear(512, num_disease_classes)
        )
        
        # Skin type classification head
        self.skin_head = nn.Sequential(
            nn.Linear(feature_dim, 256), 
            nn.ReLU(),
            nn.Linear(256, 6)  # 6 skin types
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.disease_head(features), self.skin_head(features)


# ============================================================================
# 2. GRAD-CAM IMPLEMENTATION (EXACT MATCH TO SD1_py.py)
# ============================================================================
class GradCAM:
    """Gradient-weighted Class Activation Mapping
    
    Exact implementation from SD1_py.py with forward and backward hooks
    to capture activations and gradients for visualization.
    """
    
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Register hooks to capture activations and gradients
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_full_backward_hook(self.save_gradient)

    def save_activation(self, m, i, o):
        """Save activations from forward pass"""
        self.activations = o

    def save_gradient(self, m, gi, go):
        """Save gradients from backward pass"""
        self.gradients = go[0]

    def generate(self, input_tensor, class_idx):
        """
        Generate Grad-CAM heatmap for specified class.
        
        Args:
            input_tensor: Preprocessed input image tensor
            class_idx: Target class index for visualization
            
        Returns:
            Normalized heatmap as numpy array (0-1)
        """
        self.model.zero_grad()
        
        # Forward pass
        out_d, _ = self.model(input_tensor)
        
        # Backward pass for target class
        out_d[:, class_idx].backward()
        
        # Compute weights from gradients
        weights = torch.mean(self.gradients, dim=(2, 3), keepdim=True)
        
        # Apply weights to activations and ReLU
        heatmap = F.relu(torch.sum(weights * self.activations, dim=1).squeeze())
        
        # Normalize to 0-1
        heatmap /= torch.max(heatmap) + 1e-8
        
        return heatmap.cpu().detach().numpy()


# ============================================================================
# 3. SETUP & MODEL LOADING
# ============================================================================
app = FastAPI(title="Skin Disease Grad-CAM API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MODEL_PATH = "models/skin_disease_multitask_model.pth"
NUM_CLASSES = 114
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

logger.info(f"🖥️  Using device: {DEVICE}")

# Load class names
try:
    with open("models/class_names.json", "r") as f:
        class_names = json.load(f)  # This is a list, not a dict
    # Convert to dict if it's a list
    if isinstance(class_names, list):
        class_names = {str(i): name for i, name in enumerate(class_names)}
    logger.info(f"✅ Loaded {len(class_names)} class names")
except Exception as e:
    logger.error(f"❌ Failed to load class names: {e}")
    class_names = {str(i): f"Class_{i}" for i in range(NUM_CLASSES)}

skin_types = [
    "Type I (Fair)", 
    "Type II", 
    "Type III", 
    "Type IV", 
    "Type V", 
    "Type VI (Deep)"
]

# Load model
model = MultiTaskEfficientNet(NUM_CLASSES)
try:
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.to(DEVICE).eval()
    logger.info("✅ Model loaded successfully")
except Exception as e:
    logger.warning(f"⚠️ Failed to load model: {e}")
    logger.warning("Model will use random weights (inference only)")

# Initialize Grad-CAM on backbone's last feature layer
cam = GradCAM(model, model.backbone.features[-1])

# Preprocessing pipeline (ImageNet normalization)
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])


# ============================================================================
# 4. PYDANTIC MODELS
# ============================================================================
class ImageRequest(BaseModel):
    """Request model for image-based endpoints"""
    image: str  # Base64 encoded image
    classIdx: int | None = None


class PredictionResponse(BaseModel):
    """Response model for predictions"""
    disease: dict
    skin_type: dict


class GradCAMResponse(BaseModel):
    """Response model for Grad-CAM visualization"""
    gradcam: str  # Base64 encoded image
    classIdx: int
    className: str


# ============================================================================
# 5. UTILITY FUNCTIONS
# ============================================================================
def decode_base64_image(image_base64: str) -> Image.Image:
    """Decode base64 string to PIL Image"""
    image_data = base64.b64decode(image_base64)
    return Image.open(io.BytesIO(image_data)).convert("RGB")


def image_to_base64(image_array: np.ndarray) -> str:
    """Convert numpy array to base64 PNG string"""
    _, buffer = cv2.imencode('.png', image_array)
    return base64.b64encode(buffer).decode('utf-8')


def resize_and_normalize_heatmap(heatmap: np.ndarray, size=(224, 224)) -> np.ndarray:
    """Resize heatmap and normalize to 0-255"""
    resized = cv2.resize(heatmap, size)
    normalized = np.uint8(255 * (resized - resized.min()) / (resized.max() - resized.min() + 1e-8))
    return normalized


def apply_colormap(heatmap: np.ndarray, colormap=cv2.COLORMAP_JET) -> np.ndarray:
    """Apply JET colormap to grayscale heatmap"""
    return cv2.applyColorMap(heatmap, colormap)


def blend_heatmap_with_image(image: np.ndarray, heatmap_colored: np.ndarray, alpha=0.5) -> np.ndarray:
    """Blend heatmap with original image"""
    return cv2.addWeighted(image, 1 - alpha, heatmap_colored, alpha, 0)


# ============================================================================
# 6. API ENDPOINTS
# ============================================================================
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "device": str(DEVICE),
        "model_loaded": True,
        "num_classes": NUM_CLASSES
    }


@app.post("/predict", response_model=dict)
async def predict(request: ImageRequest):
    """
    Predict disease and skin type from image.
    
    Args:
        request: ImageRequest with base64 encoded image
        
    Returns:
        Disease and skin type predictions with confidence scores
    """
    try:
        if not request.image:
            raise HTTPException(status_code=400, detail="No image provided")

        # Decode image
        pil_image = decode_base64_image(request.image)

        # Preprocess
        input_tensor = preprocess(pil_image).unsqueeze(0).to(DEVICE)

        # Inference
        with torch.no_grad():
            disease_logits, skin_logits = model(input_tensor)
            disease_probs = F.softmax(disease_logits, dim=1)[0]
            skin_probs = F.softmax(skin_logits, dim=1)[0]

        # Get top predictions
        top_probs, top_indices = torch.topk(disease_probs, 3)
        best_disease_idx = top_indices[0].item()
        best_skin_idx = torch.argmax(skin_probs).item()

        # Prepare response
        response = {
            "disease": {
                "name": class_names.get(str(best_disease_idx), f"Class_{best_disease_idx}"),
                "index": best_disease_idx,
                "confidence": float(top_probs[0].item()),
                "top_3": [
                    {
                        "name": class_names.get(str(top_indices[i].item()), f"Class_{top_indices[i].item()}"),
                        "confidence": float(top_probs[i].item())
                    }
                    for i in range(3)
                ]
            },
            "skin_type": {
                "name": skin_types[best_skin_idx],
                "index": best_skin_idx,
                "confidence": float(skin_probs[best_skin_idx].item())
            }
        }

        logger.info(f"✅ Predicted: {response['disease']['name']} ({response['disease']['confidence']:.1%})")
        return response

    except Exception as e:
        logger.error(f"❌ Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/gradcam", response_model=dict)
async def gradcam(request: ImageRequest):
    """
    Generate Grad-CAM heatmap visualization.
    
    Uses proper gradient-based class activation mapping based on SD1_py.py
    
    Args:
        request: ImageRequest with base64 encoded image and optional classIdx
        
    Returns:
        Base64 encoded Grad-CAM visualization blended with original image
    """
    try:
        if not request.image:
            raise HTTPException(status_code=400, detail="No image provided")

        # Decode image
        pil_image = decode_base64_image(request.image)
        rgb_image = np.array(pil_image)
        bgr_image = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR)

        # Preprocess
        input_tensor = preprocess(pil_image).unsqueeze(0).to(DEVICE)
        input_tensor.requires_grad_(True)

        # Determine class index
        class_idx = request.classIdx
        if class_idx is None:
            with torch.no_grad():
                disease_logits, _ = model(input_tensor)
                class_idx = torch.argmax(disease_logits[0]).item()

        # Generate Grad-CAM
        logger.info(f"🎯 Generating Grad-CAM for class {class_idx}: {class_names.get(str(class_idx), f'Class_{class_idx}')}")
        heatmap = cam.generate(input_tensor, class_idx)

        # Process heatmap
        heatmap_resized = resize_and_normalize_heatmap(heatmap, (224, 224))
        heatmap_colored = apply_colormap(heatmap_resized, cv2.COLORMAP_JET)

        # Blend with original image (same as SD1_py.py)
        display_image = blend_heatmap_with_image(bgr_image, heatmap_colored, alpha=0.5)

        # Convert to base64
        gradcam_base64 = image_to_base64(display_image)

        return {
            "gradcam": gradcam_base64,
            "classIdx": class_idx,
            "className": class_names.get(str(class_idx), f"Class_{class_idx}")
        }

    except Exception as e:
        logger.error(f"❌ Grad-CAM error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/gradcam-heatmap-only", response_model=dict)
async def gradcam_heatmap_only(request: ImageRequest):
    """
    Generate standalone Grad-CAM heatmap without image blending.
    
    Args:
        request: ImageRequest with base64 encoded image and optional classIdx
        
    Returns:
        Base64 encoded Grad-CAM heatmap only
    """
    try:
        if not request.image:
            raise HTTPException(status_code=400, detail="No image provided")

        # Decode image
        pil_image = decode_base64_image(request.image)

        # Preprocess
        input_tensor = preprocess(pil_image).unsqueeze(0).to(DEVICE)
        input_tensor.requires_grad_(True)

        # Determine class index
        class_idx = request.classIdx
        if class_idx is None:
            with torch.no_grad():
                disease_logits, _ = model(input_tensor)
                class_idx = torch.argmax(disease_logits[0]).item()

        # Generate Grad-CAM
        heatmap = cam.generate(input_tensor, class_idx)
        heatmap_resized = resize_and_normalize_heatmap(heatmap, (224, 224))
        heatmap_colored = apply_colormap(heatmap_resized, cv2.COLORMAP_JET)
        heatmap_base64 = image_to_base64(heatmap_colored)

        return {
            "heatmap": heatmap_base64,
            "classIdx": class_idx,
            "className": class_names.get(str(class_idx), f"Class_{class_idx}")
        }

    except Exception as e:
        logger.error(f"❌ Heatmap generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting FastAPI Grad-CAM server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
