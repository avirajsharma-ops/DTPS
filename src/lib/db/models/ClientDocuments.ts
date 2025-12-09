import mongoose from "mongoose";

const ClientDocumentSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["meal-picture", "medical-report"], required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.ClientDocument ||
  mongoose.model("ClientDocument", ClientDocumentSchema);
