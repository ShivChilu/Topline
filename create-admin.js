const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
const username = args[0];
const password = args[1];

if (!username || !password) {
  console.log("Usage: node --env-file=.env create-admin.js <username> <password>");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;

// Define Admin Schema directly for CJS script compatibility
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'superadmin' },
  createdAt: { type: Date, default: Date.now },
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

console.log("Connecting to Database...");
mongoose.connect(uri)
  .then(async () => {
    // Check if user already exists
    const existing = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      console.log(`Error: Admin username "${username}" already exists.`);
      process.exit(1);
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    await Admin.create({
      username: username.toLowerCase().trim(),
      passwordHash,
      role: 'superadmin'
    });

    console.log("\n================================================");
    console.log(`SUCCESS: Admin account "${username}" created!`);
    console.log("You can now log in at http://localhost:3000/admin/login");
    console.log("================================================");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
