const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    res_id: {
      type: mongoose.ObjectId,
      ref: "Restaurants",
    },
    branchID: {
      type: mongoose.ObjectId,
      ref: "Branches",
    },
    itemName: {
      type: String,
    },
    vendorName: {
      type: String,
    },
    unit: {
      type: Number,
    },
    unitPrice: {
      type: Number,
    },
    unitType: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("inventory", inventorySchema);
