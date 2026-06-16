const mongoose = require("mongoose");

const panchangCacheSchema = new mongoose.Schema(
  {
    date: {
      type: String, // "YYYY-MM-DD" format in IST
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["prokerala-live", "prokerala-cache", "panchang-ts-fallback"],
      default: "prokerala-live",
    },
    tithi: {
      name: String,
      paksha: String, // "Shukla" or "Krishna"
      start: String, // ISO 8601 datetime
      end: String, // ISO 8601 datetime
      completionPercentage: Number,
    },
    varjyam: [
      {
        start: String, // ISO 8601 datetime
        end: String, // ISO 8601 datetime
        _id: false,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding cache by date
panchangCacheSchema.index({ date: 1 });

module.exports = mongoose.model("PanchangCache", panchangCacheSchema);
