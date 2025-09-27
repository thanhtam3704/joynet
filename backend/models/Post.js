const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      max: 500,
      default: "",
    },
    displayName: {
      type: String,
      default: "",
    },
    file: {
      type: String,
      default: "",
    },
    comments: {
      type: Array,
      default: [],
    },
    likes: {
      type: Array,
      default: [],
    },
    likesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      currentTime: () => new Date(new Date().getTime() + 7 * 60 * 60 * 1000), // UTC+7 (Vietnam time)
    },
  }
);

module.exports = mongoose.model("Post", PostSchema);
