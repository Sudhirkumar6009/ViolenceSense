---
title: ViolenceSense ML Service
emoji: 🎬
colorFrom: blue
colorTo: red
sdk: docker
pinned: false
license: mit
---

# ViolenceSense ML Service

AI-powered video violence detection inference service using PyTorch.

## API Endpoints

- `GET /health` - Health check
- `GET /model/status` - Get model status
- `POST /model/load` - Load a model
- `POST /inference/predict` - Run violence detection

## Usage

```python
import requests

# Check health
response = requests.get("https://your-space.hf.space/health")
print(response.json())

# Run inference
response = requests.post(
    "https://your-space.hf.space/inference/predict",
    json={"videoPath": "/path/to/video.mp4"}
)
print(response.json())
```

## Supported Models

- VideoMAE
- TimeSformer
- SlowFast
- ResNet3D
- I3D
