const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  res_id: {
    type: mongoose.ObjectId,
    ref: "Restaurants",
    required: true,
  },
  branchID: {
    type: mongoose.ObjectId,
    ref: "Branchs",
    required: true,
  },
  packageType: {
    type: String,
    required: true,
  },
  startDate: {
    type: Number,
    required: true,
  },
  endDate: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Number,
    required: true,
  },
  updatedAt: {
    type: Number,
    required: true,
  },
  previousSubscriptions: [
    {
      packageType: {
        type: String,
        required: true,
      },
      startDate: {
        type: Number,
        required: true,
      },
      endDate: {
        type: Number,
        required: true,
      },
    },
  ],
});
module.exports = mongoose.model("Subscription", subscriptionSchema);
