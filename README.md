# ViolenceSense - AI-Powered Video Violence Detection

![ViolenceSense Banner](./docs/banner.png)

## 🎯 Overview

ViolenceSense is a full-stack AI-powered web application that performs real-time video violence detection using pretrained deep learning models. The system analyzes uploaded video content and classifies it as either **Violence** or **Non-Violence** with detailed confidence scores and evaluation metrics.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ViolenceSense Architecture                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │   Frontend   │◄──►│   Backend    │◄──►│   ML Inference Service   │  │
│  │   (Next.js)  │    │  (Express)   │    │      (Python/PyTorch)    │  │
│  │  TypeScript  │    │   Node.js    │    │          FastAPI         │  │
│  │   Tailwind   │    │   REST API   │    │        .pth Models       │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│                      ┌──────────────┐                                   │
│                      │   MongoDB    │                                   │
│                      │   Database   │                                   │
│                      └──────────────┘                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Features

- **Video Upload**: Support for MP4, AVI, MOV formats
- **Configurable Model Path**: Load custom PyTorch models (.pth) dynamically
- **Real-time Inference**: AI-powered violence detection with confidence scores
- **Evaluation Metrics**: Precision, Recall, F1-Score, Accuracy display
- **RESTful API**: Complete API endpoints for all operations
- **MongoDB Integration**: Persistent storage for predictions and model configs
- **Modular Design**: Easy model swapping without code changes

## 📁 Project Structure

```
ViolenceSense/
├── frontend/                 # Next.js + TypeScript + Tailwind
│   ├── app/                 # App router pages
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API service layer
│   ├── types/               # TypeScript interfaces
│   └── utils/               # Utility functions
│
├── backend/                  # Express.js API Server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API route definitions
│   │   ├── models/          # MongoDB schemas
│   │   ├── middleware/      # Express middleware
│   │   ├── services/        # Business logic
│   │   └── config/          # Configuration files
│   └── uploads/             # Uploaded video storage
│
├── ml-service/              # Python ML Inference Service
│   ├── app/
│   │   ├── models/          # Model loading logic
│   │   ├── inference/       # Inference pipeline
│   │   └── utils/           # Helper functions
│   └── models/              # Pretrained model storage
│
└── docs/                    # Documentation
```

## 🛠️ Tech Stack

| Layer            | Technology                           |
| ---------------- | ------------------------------------ |
| Frontend         | Next.js 14, TypeScript, Tailwind CSS |
| Backend          | Node.js, Express.js, Multer          |
| ML Service       | Python, FastAPI, PyTorch, OpenCV     |
| Database         | MongoDB with Mongoose ODM            |
| State Management | React Query / TanStack Query         |

## 📡 API Endpoints

| Method   | Endpoint                    | Description                    |
| -------- | --------------------------- | ------------------------------ |
| `POST`   | `/api/v1/videos/upload`     | Upload video for analysis      |
| `GET`    | `/api/v1/videos`            | List all analyzed videos       |
| `GET`    | `/api/v1/videos/:id`        | Get video details & prediction |
| `DELETE` | `/api/v1/videos/:id`        | Delete video and results       |
| `POST`   | `/api/v1/model/load`        | Load/configure model path      |
| `GET`    | `/api/v1/model/status`      | Get current model status       |
| `GET`    | `/api/v1/model/metrics`     | Get model evaluation metrics   |
| `POST`   | `/api/v1/inference/predict` | Run inference on video         |
| `GET`    | `/api/v1/predictions`       | Get all predictions            |
| `GET`    | `/api/v1/predictions/:id`   | Get specific prediction        |
| `GET`    | `/api/v1/health`            | API health check               |

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB 6+
- CUDA (optional, for GPU acceleration)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ViolenceSense.git
cd ViolenceSense

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install

# Install ML service dependencies
cd ../ml-service && pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
```

### Running the Application

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start ML Service (Port 8000)
cd ml-service && python main.py

# Terminal 3: Start Backend (Port 5000)
cd backend && npm run dev

# Terminal 4: Start Frontend (Port 3000)
cd frontend && npm run dev
```

## 📊 Model Information

The system supports VideoMAE-based violence detection models. Place your `.pth` model file in the `ml-service/models/` directory or configure a custom path through the API.

**Supported Model Architectures:**

- VideoMAE (Video Masked Autoencoders)
- TimeSformer
- SlowFast Networks
- 3D ResNet variants

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

---

Built with ❤️ by ViolenceSense Team
