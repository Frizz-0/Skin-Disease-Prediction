# Skin Disease Prediction

The Vite frontend runs disease classification in the browser with ONNX. The optional FastAPI service generates Grad-CAM visualizations.

| Task | Location | Hosted on |
| --- | --- | --- |
| ONNX disease inference | `frontend/src/lib/inference.ts` | Browser / Vercel static frontend |
| Grad-CAM API | `backend/app.py` (`POST /gradcam`) | Hugging Face Space or local Python |
| Backend URL config | `frontend/src/lib/config.ts` | `VITE_GRADCAM_API_URL` |

See [QUICK_START.md](./QUICK_START.md) for local setup and Vercel/Hugging Face deployment.
