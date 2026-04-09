"""
Test script for FastAPI Grad-CAM backend
Verifies prediction and Grad-CAM generation functionality
"""

import requests
import base64
import json
from PIL import Image
import numpy as np
import io

# Backend URL
BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("🏥 Testing Health Endpoint")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def create_test_image(size=(224, 224)):
    """Create a random test image"""
    # Create random RGB image
    random_array = np.random.randint(0, 256, (size[0], size[1], 3), dtype=np.uint8)
    return Image.fromarray(random_array, 'RGB')


def image_to_base64(image):
    """Convert PIL Image to base64 string"""
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def test_predict():
    """Test prediction endpoint"""
    print("\n" + "="*60)
    print("🔮 Testing Prediction Endpoint")
    print("="*60)
    
    # Create a test image
    test_image = create_test_image()
    image_base64 = image_to_base64(test_image)
    
    request_data = {
        "image": image_base64
    }
    
    response = requests.post(
        f"{BASE_URL}/predict",
        json=request_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Prediction Results:")
        print(f"   Disease: {result['disease']['name']}")
        print(f"   Confidence: {result['disease']['confidence']:.2%}")
        print(f"   Skin Type: {result['skin_type']['name']}")
        print(f"   Skin Confidence: {result['skin_type']['confidence']:.2%}")
        print(f"\n   Top 3 Predictions:")
        for i, pred in enumerate(result['disease']['top_3'], 1):
            print(f"      {i}. {pred['name']}: {pred['confidence']:.2%}")
        return True, result['disease']['index']
    else:
        print(f"❌ Error: {response.text}")
        return False, None


def test_gradcam(class_idx=None):
    """Test Grad-CAM endpoint"""
    print("\n" + "="*60)
    print("🎨 Testing Grad-CAM Endpoint")
    print("="*60)
    
    # Create a test image
    test_image = create_test_image()
    image_base64 = image_to_base64(test_image)
    
    request_data = {
        "image": image_base64
    }
    
    if class_idx is not None:
        request_data["classIdx"] = class_idx
        print(f"Generating Grad-CAM for class index: {class_idx}")
    else:
        print("Generating Grad-CAM for predicted class")
    
    response = requests.post(
        f"{BASE_URL}/gradcam",
        json=request_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Grad-CAM Generated:")
        print(f"   Class Index: {result['classIdx']}")
        print(f"   Class Name: {result['className']}")
        print(f"   Image Size: {len(result['gradcam'])} bytes (base64)")
        
        # Save the image
        image_data = base64.b64decode(result['gradcam'])
        output_path = "test_gradcam_output.png"
        with open(output_path, 'wb') as f:
            f.write(image_data)
        print(f"   Saved to: {output_path}")
        return True
    else:
        print(f"❌ Error: {response.text}")
        return False


def test_gradcam_heatmap_only(class_idx=None):
    """Test standalone Grad-CAM heatmap endpoint"""
    print("\n" + "="*60)
    print("🔥 Testing Grad-CAM Heatmap Only Endpoint")
    print("="*60)
    
    # Create a test image
    test_image = create_test_image()
    image_base64 = image_to_base64(test_image)
    
    request_data = {
        "image": image_base64
    }
    
    if class_idx is not None:
        request_data["classIdx"] = class_idx
    
    response = requests.post(
        f"{BASE_URL}/gradcam-heatmap-only",
        json=request_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Heatmap Generated:")
        print(f"   Class Index: {result['classIdx']}")
        print(f"   Class Name: {result['className']}")
        print(f"   Heatmap Size: {len(result['heatmap'])} bytes (base64)")
        
        # Save the heatmap
        heatmap_data = base64.b64decode(result['heatmap'])
        output_path = "test_heatmap_only_output.png"
        with open(output_path, 'wb') as f:
            f.write(heatmap_data)
        print(f"   Saved to: {output_path}")
        return True
    else:
        print(f"❌ Error: {response.text}")
        return False


def main():
    """Run all tests"""
    print("\n" + "🚀 "*20)
    print("FASTAPI GRAD-CAM BACKEND TEST SUITE")
    print("🚀 "*20)
    
    # Test health
    health_ok = test_health()
    if not health_ok:
        print("\n❌ Backend is not responding. Exiting.")
        return
    
    # Test prediction
    pred_ok, class_idx = test_predict()
    if not pred_ok:
        print("\n⚠️ Prediction test failed")
        return
    
    # Test Grad-CAM with predicted class
    gradcam_ok = test_gradcam(class_idx)
    if not gradcam_ok:
        print("\n⚠️ Grad-CAM test failed")
        return
    
    # Test Grad-CAM with specific class
    gradcam_ok2 = test_gradcam(class_idx=5)  # Test with a specific class
    if not gradcam_ok2:
        print("\n⚠️ Grad-CAM with specific class test failed")
        return
    
    # Test heatmap only
    heatmap_ok = test_gradcam_heatmap_only(class_idx)
    if not heatmap_ok:
        print("\n⚠️ Heatmap only test failed")
        return
    
    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED!")
    print("="*60)
    print("\n📊 Summary:")
    print("   ✅ Health endpoint working")
    print("   ✅ Prediction endpoint working")
    print("   ✅ Grad-CAM with predicted class working")
    print("   ✅ Grad-CAM with specific class working")
    print("   ✅ Heatmap-only endpoint working")
    print("\n🎉 FastAPI Grad-CAM backend is fully functional!")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Cannot connect to FastAPI backend at http://localhost:8000")
        print("   Make sure the backend is running: python app.py")
    except Exception as e:
        print(f"\n❌ Error: {e}")
