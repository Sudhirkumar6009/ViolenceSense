// MongoDB script to update model config
db = db.getSiblingDB("violencesense");

// First deactivate all models
db.modelconfigs.updateMany({}, { $set: { isActive: false, isLoaded: false } });

// Check if H5 model config exists, if not create it
var result = db.modelconfigs.findOneAndUpdate(
  { modelPath: "./models/violence_model_legacy.h5" },
  {
    $set: {
      name: "Violence Model H5",
      modelPath: "./models/violence_model_legacy.h5",
      architecture: "keras-cnn",
      version: "1.0.0",
      description: "MobileNetV2-LSTM violence detection model",
      inputSize: { frames: 16, height: 224, width: 224 },
      classes: ["violence", "non-violence"],
      isActive: true,
      isLoaded: true,
      loadedAt: new Date(),
    },
  },
  { upsert: true, returnDocument: "after" },
);

print("Updated model config:");
printjson(result);

// Show all model configs
print("\nAll model configs:");
db.modelconfigs.find().forEach(printjson);
