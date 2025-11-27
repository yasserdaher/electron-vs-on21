import mongoose from "mongoose";

const JobSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    file: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Job", JobSchema);
