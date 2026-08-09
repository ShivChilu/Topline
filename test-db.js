const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
console.log("Attempting connection to:", uri ? uri.replace(/:([^@]+)@/, ":****@") : "undefined");

mongoose.connect(uri)
  .then(() => {
    console.log("\n================================================");
    console.log("SUCCESS: Connected to MongoDB Atlas successfully!");
    console.log("================================================");
    process.exit(0);
  })
  .catch((err) => {
    console.log("\n================================================");
    console.log("ERROR: Failed to connect to MongoDB Atlas!");
    console.log("Details below:");
    console.log("================================================");
    console.error(err);
    process.exit(1);
  });
