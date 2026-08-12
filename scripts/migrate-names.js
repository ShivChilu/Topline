const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in .env");
  process.exit(1);
}

const Schema = mongoose.Schema;
const studentSchema = new Schema({
  name: String,
  phone: String,
  universityId: String
});
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

const applicationSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
  name: String,
  mobileNumber: String,
  registrationNumber: String,
  customFieldsData: { type: Schema.Types.Map, of: Schema.Types.Mixed }
});
const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);

const eventSchema = new Schema({
  customFormFields: Array
});
const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

function isValidPhoneNumber(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/[^0-9]/g, "");
  // Check if it looks like a legitimate phone number (usually 10 digits or more, not just a registration ID)
  return cleaned.length >= 10;
}

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to database successfully.");

    const apps = await Application.find({}).populate('studentId').populate('eventId');
    console.log(`Found ${apps.length} applications to inspect.`);

    let updatedCount = 0;
    let unchangedCount = 0;

    const nameKeys = ["name", "full name", "student name", "candidate name", "applicant name"];
    const phoneKeys = [
      "phone", "phone number", "phone no", "phone no.", "phone no:",
      "mobile", "mobile number", "mobile no", "mobile no.", "mobile no:",
      "contact", "contact number", "whatsapp", "whatsapp number", "whatsapp phone number"
    ];

    for (const app of apps) {
      const regNo = (app.registrationNumber || "").trim();
      const currentMobile = (app.mobileNumber || "").trim();

      let resolvedName = app.name || "";
      let resolvedMobile = currentMobile;

      const student = app.studentId || {};
      const event = app.eventId || {};
      const customFormFields = event.customFormFields || [];

      const data = app.customFieldsData ? (
        app.customFieldsData instanceof Map 
          ? Object.fromEntries(app.customFieldsData) 
          : app.customFieldsData
      ) : {};

      // Resolve legacy custom mobile
      let legacyMobile = "";
      for (const key of Object.keys(data)) {
        const normKey = key.toLowerCase().trim();
        if (phoneKeys.some(k => normKey.startsWith(k) || normKey.includes(k)) && data[key]) {
          legacyMobile = String(data[key]).trim();
        }
      }

      for (const field of customFormFields) {
        const normLabel = field.label.toLowerCase().trim();
        if (phoneKeys.some(k => normLabel.startsWith(k) || normLabel.includes(k)) && data[field.id]) {
          legacyMobile = String(data[field.id]).trim();
        }
      }

      // Check resolved name fallback
      if (!resolvedName) {
        for (const key of Object.keys(data)) {
          const normKey = key.toLowerCase().trim();
          if (nameKeys.includes(normKey) && data[key]) {
            resolvedName = String(data[key]).trim();
          }
        }
        if (!resolvedName && student.name) {
          resolvedName = student.name.trim();
        }
        if (!resolvedName) {
          resolvedName = `Student ${regNo || student.universityId || "N/A"}`;
        }
        app.name = resolvedName;
      }

      // Safe check for mobile number correction
      const isIncorrectMobile = !currentMobile || currentMobile === regNo || !isValidPhoneNumber(currentMobile);
      const isLegacyValid = legacyMobile && legacyMobile !== regNo && isValidPhoneNumber(legacyMobile);

      if (isIncorrectMobile && isLegacyValid) {
        resolvedMobile = legacyMobile;
      } else if (isIncorrectMobile && student.phone && student.phone !== regNo && isValidPhoneNumber(student.phone)) {
        resolvedMobile = student.phone.trim();
      } else if (isIncorrectMobile) {
        // Leave it empty/null instead of copying the registration number
        resolvedMobile = "";
      }

      if (app.mobileNumber !== resolvedMobile || app.isModified('name')) {
        app.mobileNumber = resolvedMobile;
        app.markModified('customFieldsData');
        await app.save();
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log(`Migration completed successfully! Updated: ${updatedCount}, Unchanged: ${unchangedCount} documents.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
