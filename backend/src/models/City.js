import mongoose from 'mongoose';

const citySchema = new mongoose.Schema({
  name:    { type: String, required: true, unique: true, trim: true },
  addedAt: { type: Date, default: Date.now },
});

export default mongoose.model('City', citySchema);
