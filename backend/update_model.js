const mongoose = require("mongoose");

const modelConfigSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    modelPath: String,
    architecture: String,
    version: String,
    inputSize: {
      frames: Number,
      height: Number,
      width: Number,
    },
    classes: [String],
    isActive: Boolean,
    isLoaded: Boolean,
    loadedAt: Date,
    accuracy: Number,
    totalPredictions: Number,
  },
  { collection: "modelconfigs" },
);

const ModelConfig = mongoose.model("ModelConfig", modelConfigSchema);

async function updateModel() {
  try {
    await mongoose.connect("mongodb://localhost:27017/violencesense");
    console.log("Connected to MongoDB");

    // Deactivate all models
    await ModelConfig.updateMany({}, { isActive: false, isLoaded: false });
    console.log("Deactivated all models");

    // Update or create H5 model config
    const result = await ModelConfig.findOneAndUpdate(
      { modelPath: "./models/violence_model_legacy.h5" },
      {
        name: "Violence Model H5",
        description: "MobileNetV2-LSTM violence detection model",
        modelPath: "./models/violence_model_legacy.h5",
        architecture: "keras-cnn",
        version: "1.0.0",
        inputSize: { frames: 16, height: 224, width: 224 },
        classes: ["violence", "non-violence"],
        isActive: true,
        isLoaded: true,
        loadedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    console.log("Updated model config:", JSON.stringify(result, null, 2));

    // Show all configs
    const all = await ModelConfig.find();
    console.log("\nAll model configs:", JSON.stringify(all, null, 2));

    await mongoose.disconnect();
    console.log("\nDisconnected");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

updateModel();
