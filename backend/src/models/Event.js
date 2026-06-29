import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  title: { type: String, required: true },
  description: String,
  date: Date,
  time: String,
  bannerImage: String,
  ticketPrice: { type: Number, default: 0 },
  capacity: Number,
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'past'],
    default: 'upcoming'
  },
  registrations: [{
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registeredAt:   { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Event', eventSchema);
