skin-disease-ai/

├── backend/ # FastAPI Application
│ ├── app/
│ │ ├── api/ # API Route definitions
│ │ ├── core/ # Config and security
│ │ ├── models/ # Pydantic schemas
│ │ └── services/ # Business logic
│ ├── models/ # Stored .pth or .onnx files
│ ├── scripts/ # Utility/Quantization scripts
│ ├── tests/ # Pytest for API
│ ├── Dockerfile
│ └── requirements.txt
├── frontend/ # Next.js + TypeScript + R3F
│ ├── public/
│ │ └── models/
│ │ └── human_skin_types.glb # 3D Assets
│ ├── src/
│ │ ├── components/
│ │ │ ├── ThreeCanvas.tsx # R3F 3D Model logic
│ │ │ ├── CameraView.tsx # Camera UI & Stream
│ │ │ ├── AnalysisOverlay.tsx # SVG Scanning animations
│ │ │ └── ResultCard.tsx # Glassmorphism/Framer Motion UI
│ │ ├── hooks/
│ │ │ └── useInference.ts # ONNX Runtime client-side logic
│ │ ├── lib/
│ │ │ └── constants.ts # Metadata & Disease info
│ │ └── app/ # Next.js App Router entry points
│ ├── tailwind.config.ts
│ └── package.json
├── notebooks/ # Research & Training
│ └── experimental/
├── .gitignore
└── README.md # Portfolio documentation
