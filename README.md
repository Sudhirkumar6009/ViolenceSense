<div align="center">

# 🎬 ViolenceSense

### AI-Powered Real-Time Video Violence Detection System

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-ViolenceSense-00C853?style=for-the-badge)](https://violencesense.vercel.app)
[![Report](https://img.shields.io/badge/📄_Project_Report-View_PDF-2196F3?style=for-the-badge)](https://drive.google.com/file/d/YOUR_REPORT_ID/view)
[![Dataset](https://img.shields.io/badge/📊_Dataset-Kaggle-20BEFF?style=for-the-badge)](https://www.kaggle.com/datasets/mohamedmustafa/real-life-violence-situations-dataset)
[![Colab](https://img.shields.io/badge/🔬_Training_Notebook-Google_Colab-F9AB00?style=for-the-badge)](https://colab.research.google.com/drive/YOUR_COLAB_ID)

<br/>

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-FF6F00?style=flat-square&logo=tensorflow&logoColor=white)](https://tensorflow.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

<br/>

<img src="./docs/banner.png" alt="ViolenceSense Banner" width="800"/>

<p align="center">
  <strong>Detect violence in videos using state-of-the-art deep learning models</strong>
</p>

[Features](#-features) •
[Demo](#-live-demo) •
[Architecture](#-architecture) •
[Installation](#-installation) •
[API](#-api-reference) •
[Model](#-model-information) •
[Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Live Demo](#-live-demo)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Model Information](#-model-information)
- [Screenshots](#-screenshots)
- [Performance](#-performance)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**ViolenceSense** is a production-ready, full-stack AI web application that performs real-time violence detection in video content. Built with modern technologies and deep learning, it provides:

- 🔍 **Accurate Detection**: MobileNetV2-LSTM architecture with 90%+ accuracy
- ⚡ **Real-time Analysis**: Fast inference using optimized TensorFlow models
- 📊 **Detailed Insights**: Confidence scores, probabilities, and frame analysis
- 🌐 **Cloud-Ready**: Deployed on Vercel, Render, and Hugging Face Spaces

### Use Cases

- 🏫 **Educational Institutions**: Monitor campus security footage
- 🏢 **Corporate Security**: Automated surveillance analysis
- 📱 **Social Media Platforms**: Content moderation at scale
- 🎮 **Gaming/Streaming**: Real-time content filtering
- 🔬 **Research**: Violence detection dataset analysis

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎥 Video Processing

- Multi-format support (MP4, AVI, MOV, MKV)
- Automatic frame extraction & preprocessing
- GridFS storage in MongoDB Atlas
- Streaming playback support

</td>
<td width="50%">

### 🤖 AI Analysis

- MobileNetV2-LSTM deep learning model
- Binary classification (Violence/Non-Violence)
- Confidence scores with probabilities
- Batch processing capability

</td>
</tr>
<tr>
<td width="50%">

### 📊 Dashboard

- Real-time prediction results
- Video history management
- Model status monitoring
- Interactive visualizations

</td>
<td width="50%">

### 🔧 Developer Experience

- RESTful API with full documentation
- TypeScript throughout
- Docker support
- CI/CD ready

</td>
</tr>
</table>

---

## 🌐 Live Demo

| Service            | URL                                                                                                                  | Status                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 🖥️ **Frontend**    | [violencesense.vercel.app](https://violencesense.vercel.app)                                                         | ![Vercel](https://img.shields.io/badge/Vercel-Live-00C853?style=flat-square)           |
| ⚙️ **Backend API** | [violencesense-api.onrender.com](https://violencesense-api.onrender.com)                                             | ![Render](https://img.shields.io/badge/Render-Live-46E3B7?style=flat-square)           |
| 🧠 **ML Service**  | [huggingface.co/spaces/SudhirKuchara/violencesense-ml](https://huggingface.co/spaces/SudhirKuchara/violencesense-ml) | ![HuggingFace](https://img.shields.io/badge/HuggingFace-Live-FFD21E?style=flat-square) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ViolenceSense System Architecture                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌─────────────┐         ┌─────────────┐         ┌─────────────────┐     │
│    │   Client    │  HTTPS  │   Vercel    │         │  Hugging Face   │     │
│    │   Browser   │◄───────►│   (Next.js) │         │    Spaces       │     │
│    └─────────────┘         └──────┬──────┘         └────────┬────────┘     │
│                                   │                          │              │
│                                   │ REST API                 │ FastAPI      │
│                                   ▼                          │              │
│                            ┌─────────────┐                   │              │
│                            │   Render    │◄──────────────────┘              │
│                            │  (Node.js)  │     ML Inference                 │
│                            └──────┬──────┘                                  │
│                                   │                                         │
│                                   │ Mongoose                                │
│                                   ▼                                         │
│                            ┌─────────────┐                                  │
│                            │  MongoDB    │                                  │
│                            │   Atlas     │                                  │
│                            │  (GridFS)   │                                  │
│                            └─────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Upload**: User uploads video → Frontend → Backend → MongoDB GridFS
2. **Process**: Backend extracts video → Sends to ML Service for inference
3. **Analyze**: ML Service processes frames → Returns prediction
4. **Display**: Results stored in MongoDB → Displayed on Frontend

---

## 🛠️ Tech Stack

<table>
<tr>
<th>Layer</th>
<th>Technology</th>
<th>Purpose</th>
</tr>
<tr>
<td><strong>Frontend</strong></td>
<td>
<img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" />
<img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white" />
</td>
<td>UI, Animations, Styling</td>
</tr>
<tr>
<td><strong>Backend</strong></td>
<td>
<img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white" />
<img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
</td>
<td>REST API, File Handling</td>
</tr>
<tr>
<td><strong>ML Service</strong></td>
<td>
<img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=flat-square&logo=tensorflow&logoColor=white" />
<img src="https://img.shields.io/badge/OpenCV-5C3EE8?style=flat-square&logo=opencv&logoColor=white" />
</td>
<td>Deep Learning Inference</td>
</tr>
<tr>
<td><strong>Database</strong></td>
<td>
<img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" />
<img src="https://img.shields.io/badge/GridFS-47A248?style=flat-square&logo=mongodb&logoColor=white" />
</td>
<td>Data & Video Storage</td>
</tr>
<tr>
<td><strong>Deployment</strong></td>
<td>
<img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white" />
<img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white" />
<img src="https://img.shields.io/badge/HuggingFace-FFD21E?style=flat-square&logo=huggingface&logoColor=black" />
</td>
<td>Cloud Hosting</td>
</tr>
</table>

---

## 📁 Project Structure

```
ViolenceSense/
│
├── 📂 frontend/                    # Next.js 14 Frontend Application
│   ├── app/                        # App Router pages
│   │   ├── page.tsx               # Home/Dashboard
│   │   ├── upload/                # Video upload page
│   │   ├── videos/                # Video gallery & player
│   │   ├── predictions/           # Prediction history
│   │   ├── model/                 # Model management
│   │   └── settings/              # App settings
│   ├── components/                 # Reusable UI components
│   ├── services/                   # API service layer
│   ├── hooks/                      # Custom React hooks
│   ├── types/                      # TypeScript definitions
│   └── lib/                        # Utility functions
│
├── 📂 backend/                     # Express.js API Server
│   ├── src/
│   │   ├── controllers/           # Request handlers
│   │   ├── routes/                # API route definitions
│   │   ├── models/                # MongoDB schemas
│   │   ├── middleware/            # Express middleware
│   │   ├── services/              # Business logic
│   │   ├── config/                # Configuration (DB, GridFS)
│   │   └── utils/                 # Helper utilities
│   └── uploads/                    # Temporary file storage
│
├── 📂 ml-service/                  # Python ML Inference Service
│   ├── app/
│   │   ├── models/                # Model loading logic
│   │   ├── inference/             # Inference pipeline
│   │   └── utils/                 # Video processing utils
│   ├── models/                     # Trained model files (.h5)
│   └── main.py                     # FastAPI application
│
├── 📂 models/                      # Shared model storage
│   └── violence_model_legacy.h5   # Trained Keras model
│
├── 📄 docker-compose.yml           # Docker orchestration
├── 📄 setup.bat / setup.sh         # Setup scripts
└── 📄 README.md                    # This file
```

---

## 🚀 Installation

### Prerequisites

| Requirement | Version | Installation                                    |
| ----------- | ------- | ----------------------------------------------- |
| Node.js     | 18+     | [nodejs.org](https://nodejs.org)                |
| Python      | 3.9+    | [python.org](https://python.org)                |
| MongoDB     | 6+      | [mongodb.com](https://mongodb.com) or use Atlas |
| Git         | Latest  | [git-scm.com](https://git-scm.com)              |

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Sudhirkumar6009/ViolenceSense.git
cd ViolenceSense

# 2. Run the setup script
# Windows:
.\setup.bat

# Linux/Mac:
chmod +x setup.sh && ./setup.sh
```

### Manual Installation

<details>
<summary><strong>Frontend Setup</strong></summary>

```bash
cd frontend
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

# Start development server
npm run dev
```

</details>

<details>
<summary><strong>Backend Setup</strong></summary>

```bash
cd backend
npm install

# Create environment file
cp .env.example .env

# Edit .env with your MongoDB URI and ML Service URL
MONGODB_URI=mongodb+srv://your-connection-string
ML_SERVICE_URL=http://localhost:8000

# Start development server
npm run dev
```

</details>

<details>
<summary><strong>ML Service Setup</strong></summary>

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Start the service
python main.py
```

</details>

### Using Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## ⚙️ Configuration

### Environment Variables

<details>
<summary><strong>Frontend (.env.local)</strong></summary>

| Variable              | Description     | Default                        |
| --------------------- | --------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:5000/api/v1` |

</details>

<details>
<summary><strong>Backend (.env)</strong></summary>

| Variable             | Description               | Default                             |
| -------------------- | ------------------------- | ----------------------------------- |
| `PORT`               | Server port               | `5000`                              |
| `NODE_ENV`           | Environment               | `development`                       |
| `MONGODB_URI`        | MongoDB connection string | -                                   |
| `MONGODB_DB_NAME`    | Database name             | `ViolenceSense`                     |
| `ML_SERVICE_URL`     | ML service URL            | `http://localhost:8000`             |
| `DEFAULT_MODEL_PATH` | Model file path           | `./models/violence_model_legacy.h5` |
| `MODEL_ARCHITECTURE` | Model type                | `keras-cnn`                         |
| `CORS_ORIGIN`        | Allowed origins           | `http://localhost:3000`             |

</details>

<details>
<summary><strong>ML Service (.env)</strong></summary>

| Variable     | Description       | Default                             |
| ------------ | ----------------- | ----------------------------------- |
| `MODEL_PATH` | Path to .h5 model | `./models/violence_model_legacy.h5` |
| `DEVICE`     | Inference device  | `cpu`                               |

</details>

---

## 📡 API Reference

### Base URL

```
Production: https://violencesense-api.onrender.com/api/v1
Development: http://localhost:5000/api/v1
```

### Endpoints

<details>
<summary><strong>📹 Videos</strong></summary>

| Method   | Endpoint             | Description                 |
| -------- | -------------------- | --------------------------- |
| `POST`   | `/videos/upload`     | Upload a video file         |
| `GET`    | `/videos`            | List all videos (paginated) |
| `GET`    | `/videos/:id`        | Get video details           |
| `GET`    | `/videos/:id/stream` | Stream video content        |
| `DELETE` | `/videos/:id`        | Delete video                |

**Upload Video Example:**

```bash
curl -X POST \
  -F "video=@sample.mp4" \
  https://violencesense-api.onrender.com/api/v1/videos/upload
```

</details>

<details>
<summary><strong>🤖 Inference</strong></summary>

| Method | Endpoint             | Description            |
| ------ | -------------------- | ---------------------- |
| `POST` | `/inference/predict` | Run violence detection |

**Predict Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"videoId": "64abc123..."}' \
  https://violencesense-api.onrender.com/api/v1/inference/predict
```

**Response:**

```json
{
  "success": true,
  "data": {
    "classification": "violence",
    "confidence": 0.94,
    "probabilities": {
      "violence": 0.94,
      "nonViolence": 0.06
    }
  }
}
```

</details>

<details>
<summary><strong>🧠 Model</strong></summary>

| Method | Endpoint         | Description            |
| ------ | ---------------- | ---------------------- |
| `POST` | `/model/load`    | Load a model           |
| `GET`  | `/model/status`  | Get model status       |
| `GET`  | `/model/current` | Get current model info |

</details>

<details>
<summary><strong>📊 Predictions</strong></summary>

| Method | Endpoint           | Description            |
| ------ | ------------------ | ---------------------- |
| `GET`  | `/predictions`     | List all predictions   |
| `GET`  | `/predictions/:id` | Get prediction details |

</details>

<details>
<summary><strong>❤️ Health</strong></summary>

| Method | Endpoint           | Description            |
| ------ | ------------------ | ---------------------- |
| `GET`  | `/health`          | API health check       |
| `GET`  | `/health/detailed` | Detailed system status |

</details>

---

## 🧠 Model Information

### Architecture

```
Input (16 frames × 224 × 224 × 3)
         │
         ▼
┌─────────────────────┐
│  MobileNetV2 (CNN)  │  ← Feature extraction
│  (pretrained)       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  TimeDistributed    │  ← Apply CNN to each frame
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│      LSTM (64)      │  ← Temporal sequence learning
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Dense + Dropout   │  ← Classification
└─────────┬───────────┘
          │
          ▼
    Output (2 classes)
    [Violence, Non-Violence]
```

### Model Details

| Property           | Value                      |
| ------------------ | -------------------------- |
| **Architecture**   | MobileNetV2 + LSTM         |
| **Input Shape**    | (16, 224, 224, 3)          |
| **Output Classes** | 2 (Violence, Non-Violence) |
| **File Format**    | Keras H5 (.h5)             |
| **File Size**      | ~15 MB                     |
| **Framework**      | TensorFlow/Keras           |

### Training Dataset

The model was trained on the [Real Life Violence Situations Dataset](https://www.kaggle.com/datasets/mohamedmustafa/real-life-violence-situations-dataset):

- **Total Videos**: 2,000
- **Violence**: 1,000 videos
- **Non-Violence**: 1,000 videos
- **Source**: Real-life footage, movies, sports

---

## Screenshots

<div align="center">

| Dashboard                                      | Video Analysis                               |
| ---------------------------------------------- | -------------------------------------------- |
| ![Dashboard](./docs/screenshots/dashboard.png) | ![Analysis](./docs/screenshots/analysis.png) |

| Upload                                   | Results                                    |
| ---------------------------------------- | ------------------------------------------ |
| ![Upload](./docs/screenshots/upload.png) | ![Results](./docs/screenshots/results.png) |

</div>

---

## 📈 Performance

### Inference Benchmarks

| Metric             | Value           |
| ------------------ | --------------- |
| **Accuracy**       | 91.2%           |
| **Precision**      | 89.5%           |
| **Recall**         | 93.1%           |
| **F1 Score**       | 91.3%           |
| **Inference Time** | ~2-5s per video |

### System Requirements

| Component   | Minimum  | Recommended     |
| ----------- | -------- | --------------- |
| **CPU**     | 2 cores  | 4+ cores        |
| **RAM**     | 4 GB     | 8+ GB           |
| **Storage** | 1 GB     | 5+ GB           |
| **GPU**     | Optional | CUDA-compatible |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Real Life Violence Situations Dataset](https://www.kaggle.com/datasets/mohamedmustafa/real-life-violence-situations-dataset) by Mohamed Mustafa
- [TensorFlow](https://tensorflow.org) team
- [Next.js](https://nextjs.org) team
- [FastAPI](https://fastapi.tiangolo.com) team

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by [Sudhir Kumar](https://github.com/Sudhirkumar6009)

[![GitHub](https://img.shields.io/badge/GitHub-Sudhirkumar6009-181717?style=for-the-badge&logo=github)](https://github.com/Sudhirkumar6009)

</div>
