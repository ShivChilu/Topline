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

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to database successfully.");

    const apps = await Application.find({}).populate('studentId').populate('eventId');
    console.log(`Found ${apps.length} applications to inspect.`);

    let migratedCount = 0;

    const nameKeys = ["name", "full name", "student name", "candidate name", "applicant name"];
    const phoneKeys = ["phone", "phone number", "mobile", "mobile number", "contact", "contact number", "whatsapp", "whatsapp number", "whatsapp phone number"];

    for (const app of apps) {
      let resolvedName = app.name || "";
      let resolvedMobile = app.mobileNumber || "";

      const student = app.studentId || {};
      const event = app.eventId || {};
      const customFormFields = event.customFormFields || [];

      const data = app.customFieldsData ? (
        app.customFieldsData instanceof Map 
          ? Object.fromEntries(app.customFieldsData) 
          : app.customFieldsData
      ) : {};

      let foundNameFieldId = null;
      let foundMobileFieldId = null;

      for (const key of Object.keys(data)) {
        const normKey = key.toLowerCase().trim();
        if (nameKeys.includes(normKey) && data[key]) {
          resolvedName = String(data[key]).trim();
          foundNameFieldId = key;
        }
        if (phoneKeys.includes(normKey) && data[key]) {
          resolvedMobile = String(data[key]).trim();
          foundMobileFieldId = key;
        }
      }

      for (const field of customFormFields) {
        const normLabel = field.label.toLowerCase().trim();
        if (nameKeys.includes(normLabel) && data[field.id]) {
          resolvedName = String(data[field.id]).trim();
          foundNameFieldId = field.id;
        }
        if (phoneKeys.includes(normLabel) && data[field.id]) {
          resolvedMobile = String(data[field.id]).trim();
          foundMobileFieldId = field.id;
        }
      }

      if (!resolvedName && student.name) {
        resolvedName = student.name.trim();
      }
      if (!resolvedMobile && student.phone) {
        resolvedMobile = student.phone.trim();
      }

      if (!resolvedName) {
        resolvedName = `Student ${app.registrationNumber || student.universityId || "N/A"}`;
      }

      app.name = resolvedName;
      app.mobileNumber = resolvedMobile;

      if (foundNameFieldId && app.customFieldsData) {
        const customVal = app.customFieldsData instanceof Map 
          ? app.customFieldsData.get(foundNameFieldId)
          : app.customFieldsData[foundNameFieldId];
        
        if (customVal && String(customVal).trim() === resolvedName) {
          if (app.customFieldsData instanceof Map) {
            app.customFieldsData.delete(foundNameFieldId);
          } else {
            delete app.customFieldsData[foundNameFieldId];
          }
        }
      }

      if (foundMobileFieldId && app.customFieldsData) {
        const customVal = app.customFieldsData instanceof Map
          ? app.customFieldsData.get(foundMobileFieldId)
          : app.customFieldsData[foundMobileFieldId];

        if (customVal && String(customVal).trim() === resolvedMobile) {
          if (app.customFieldsData instanceof Map) {
            app.customFieldsData.delete(foundMobileFieldId);
          } else {
            delete app.customFieldsData[foundMobileFieldId];
          }
        }
      }

      app.markModified('customFieldsData');
      await app.save();
      migratedCount++;
    }

    console.log(`Migration completed successfully! Migrated/Updated: ${migratedCount} documents.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
