// MongoDB initialization script
db = db.getSiblingDB("violencesense");

// Create collections
db.createCollection("videos");
db.createCollection("predictions");
db.createCollection("model_configs");

// Create indexes for videos collection
db.videos.createIndex({ createdAt: -1 });
db.videos.createIndex({ status: 1 });
db.videos.createIndex({ filename: 1 });

// Create indexes for predictions collection
db.predictions.createIndex({ videoId: 1 });
db.predictions.createIndex({ createdAt: -1 });
db.predictions.createIndex({ classification: 1 });
db.predictions.createIndex({ confidence: -1 });

// Create indexes for model_configs collection
db.model_configs.createIndex({ isActive: 1 });
db.model_configs.createIndex({ createdAt: -1 });

// Insert default model configuration
db.model_configs.insertOne({
  name: "Default Violence Detection Model",
  modelPath: "/app/models/violence_detector.pth",
  architecture: "ResNet3D",
  inputSize: {
    frames: 16,
    width: 224,
    height: 224,
  },
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

print("ViolenceSense database initialized successfully!");
