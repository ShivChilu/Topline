const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

// Define Setting Schema directly
const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);

const eliteProtocol = {
  headline: "Reliable Hospitality Workforce for Events, Hotels & Resorts",
  subheadline: "Top Line Catering connects premium hotels, resorts, and hospitality managers with a dependable, pre-screened student workforce.",
  whatsappNumber: "919876543210",
  email: "contact@toplinecatering.com",
  aboutText: "Top Line Catering delivers a premium guest experience. Every staff member represents the brand — behavior, appearance, and attitude reflect professional excellence at all times.",
  dos: [
    "Arrive on time and remain at your assigned station.",
    "Wear correct uniform (Male: black formal trousers, plain white shirt, polished black shoes, clean shave. Female: black pants/leggings with uniform top, hair in neat bun).",
    "Maintain a welcoming smile and confident posture.",
    "Greet guests politely and serve with attention to detail.",
    "Use both hands while serving when appropriate.",
    "Report all issues and complaints only to Captain.",
    "Return every item (cap, mask, uniform set) to Captain at the end of the event.",
    "Listen carefully to manager briefings and answer questions confidently."
  ],
  donts: [
    "No mobile phone usage during duty hours inside the resort.",
    "No gossiping, idle standing, or unnecessary conversations.",
    "No eating or drinking in guest service zones.",
    "No arguments, rude behavior, or loss of temper.",
    "No leaving assigned station without supervisor permission.",
    "No discussing salary/payment with locals, hotel staff, guests, or anyone else.",
    "No taking photos or videos during duty.",
    "No theft, misbehavior, or misconduct.",
    "No loud talking, laughing, or unprofessional gestures."
  ]
};

console.log("Connecting to Database to update protocol settings...");
mongoose.connect(uri)
  .then(async () => {
    const config = await Setting.findOneAndUpdate(
      { key: "homepage_content" },
      { value: eliteProtocol, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    console.log("\n================================================");
    console.log("SUCCESS: Elite Service Protocol updated in MongoDB Atlas!");
    console.log("Guidelines will now render dynamically on the public pages.");
    console.log("================================================");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
