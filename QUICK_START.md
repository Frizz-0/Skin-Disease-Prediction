# 🚀 Quick Start Guide - Grad-CAM Backend

## What Was Done

Your original frontend implementation used a **fake Grad-CAM** (confidence-based Gaussian heatmap). I've created a **production-quality FastAPI backend** that implements proper gradient-based Grad-CAM matching your original `SD1_py.py`.

## ⚡ Quick Setup (2 Commands)

### Terminal 1: Start Backend

```bash
cd backend
python app.py
```

Wait for: `Uvicorn running on http://0.0.0.0:8000`

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

**That's it!** 🎉

## ✅ Verify It Works

Run this to test the backend:

```bash
cd backend
python test_gradcam.py
```

You should see:

```
✅ ALL TESTS PASSED!
🎉 FastAPI Grad-CAM backend is fully functional!
```

## How It Works (Frontend → Backend Flow)

```
1. User captures image with camera
2. Frontend sends image to: http://localhost:8000/predict
3. Backend predicts disease & skin type
4. Frontend sends image + class to: http://localhost:8000/gradcam
5. Backend computes real Grad-CAM using PyTorch gradients
6. Returns visualization with JET colormap overlay
7. Frontend displays Grad-CAM in the UI
```

## Key Improvements

| Before                | After                             |
| --------------------- | --------------------------------- |
| Fake Gaussian heatmap | Real gradient-based visualization |
| Frontend-only         | Backend + Frontend                |
| No model integration  | Direct PyTorch model access       |
| Generic blob          | Class-specific attention maps     |

## API Endpoints (For Reference)

- `GET /health` - Health check
- `POST /predict` - Get disease prediction
- `POST /gradcam` - Generate Grad-CAM visualization
- `POST /gradcam-heatmap-only` - Get heatmap only

## Troubleshooting

**Backend fails to start?**

```bash
cd backend
pip install -r requirements.txt
python app.py
```

**Frontend can't connect?**

- Ensure backend is running on port 8000
- Check browser console for errors

**Want to see test outputs?**

```bash
cd backend
# Test images are saved as:
# - test_gradcam_output.png
# - test_heatmap_only_output.png
```

---

**Status**: ✅ Ready to use!

The backend is currently running on `http://localhost:8000` and all tests have passed.
