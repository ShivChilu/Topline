import mongoose, { Schema, Document, Model } from "mongoose";

// --- ADMIN SCHEMA ---
export interface IAdmin extends Document {
  username: string;
  passwordHash: string;
  role: 'admin' | 'superadmin';
  createdAt: Date;
}
const AdminSchema = new Schema<IAdmin>({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  createdAt: { type: Date, default: Date.now },
});

// --- CLIENT SCHEMA ---
export interface IClient extends Document {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: Date;
}
const ClientSchema = new Schema<IClient>({
  name: { type: String, required: true },
  contactPerson: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// --- EVENT SCHEMA ---
export interface IFormField {
  id: string;
  type: 'text' | 'paragraph' | 'number' | 'email' | 'phone' | 'date' | 'time' | 'select' | 'checkbox' | 'radio' | 'yesno' | 'rating' | 'file';
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For dropdowns, multi choice, checkboxes
  min?: number;
  max?: number;
}

export interface IEvent extends Document {
  name: string;
  date: Date;
  location: string;
  googleMapsUrl?: string;
  reportingTime: string;
  startTime: string;
  endTime: string;
  workType: string;
  description: string;
  instructions?: string;
  dressCode?: string;
  dosAndDonts?: string[];
  workersRequired: number;
  maxApplications: number;
  applicationsCount: number;
  paymentPerStudent: number;
  clientRevenue: number;
  otherExpenses: number;
  status: 'DRAFT' | 'OPEN' | 'FULL' | 'CLOSED' | 'COMPLETED' | 'ARCHIVED';
  visibility: 'VISIBLE' | 'HIDDEN';
  clientId?: mongoose.Types.ObjectId;
  customFormFields: IFormField[];
  attendanceToken?: string;
  attendanceTokenEnabled?: boolean;
  attendanceVerificationField?: string;
  attendanceWindowStart?: Date;
  attendanceWindowEnd?: Date;
  gracePeriod?: number;
  attendanceDisplayFields?: string[];
  createdAt: Date;
}

const FormFieldSchema = new Schema<IFormField>({
  id: { type: String, required: true },
  type: { type: String, required: true },
  label: { type: String, required: true },
  description: { type: String },
  required: { type: Boolean, default: false },
  placeholder: { type: String },
  options: { type: [String], default: [] },
  min: { type: Number },
  max: { type: Number },
});

const EventSchema = new Schema<IEvent>({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  googleMapsUrl: { type: String },
  reportingTime: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  workType: { type: String, required: true },
  description: { type: String, required: true },
  instructions: { type: String },
  dressCode: { type: String },
  dosAndDonts: { type: [String], default: [] },
  workersRequired: { type: Number, required: true },
  maxApplications: { type: Number, required: true },
  applicationsCount: { type: Number, default: 0 },
  paymentPerStudent: { type: Number, required: true },
  clientRevenue: { type: Number, default: 0 },
  otherExpenses: { type: Number, default: 0 },
  status: { type: String, enum: ['DRAFT', 'OPEN', 'FULL', 'CLOSED', 'COMPLETED', 'ARCHIVED'], default: 'DRAFT' },
  visibility: { type: String, enum: ['VISIBLE', 'HIDDEN'], default: 'VISIBLE' },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
  customFormFields: { type: [FormFieldSchema], default: [] },
  attendanceToken: { type: String },
  attendanceTokenEnabled: { type: Boolean, default: false },
  attendanceVerificationField: { type: String, default: "registrationNumber" },
  attendanceWindowStart: { type: Date },
  attendanceWindowEnd: { type: Date },
  gracePeriod: { type: Number, default: 15 },
  attendanceDisplayFields: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// --- STUDENT SCHEMA ---
export interface IStudent extends Document {
  name: string;
  phone: string;
  email: string;
  university: string;
  universityId: string;
  profilePhotoUrl?: string;
  status: 'active' | 'blocked';
  appliedCount: number;
  selectedCount: number;
  attendedCount: number;
  cancelledCount: number;
  totalEarnings: number;
  createdAt: Date;
}
const StudentSchema = new Schema<IStudent>({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  university: { type: String, required: true },
  universityId: { type: String, required: true, unique: true },
  profilePhotoUrl: { type: String },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  appliedCount: { type: Number, default: 0 },
  selectedCount: { type: Number, default: 0 },
  attendedCount: { type: Number, default: 0 },
  cancelledCount: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// --- APPLICATION SCHEMA ---
export interface IApplication extends Document {
  eventId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: 'applied' | 'under_review' | 'selected' | 'rejected' | 'confirmed' | 'cancelled' | 'attended' | 'absent' | 'paid';
  customFieldsData: Record<string, any>;
  paymentOverride?: number;
  checkInTime?: Date;
  checkOutTime?: Date;
  registrationNumber?: string;
  paymentStatus?: 'UNPAID' | 'PAID';
  messageStatus?: 'NOT_SENT' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: Date;
}
const ApplicationSchema = new Schema<IApplication>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['applied', 'under_review', 'selected', 'rejected', 'confirmed', 'cancelled', 'attended', 'absent', 'paid'], default: 'applied' },
  customFieldsData: { type: Schema.Types.Map, of: Schema.Types.Mixed, default: {} },
  paymentOverride: { type: Number },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  registrationNumber: { type: String },
  paymentStatus: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
  messageStatus: { type: String, enum: ['NOT_SENT', 'SENT', 'DELIVERED', 'READ', 'FAILED'], default: 'NOT_SENT' },
  createdAt: { type: Date, default: Date.now },
});

// Create unique compound indexes
ApplicationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });
ApplicationSchema.index({ eventId: 1, registrationNumber: 1 }, { unique: true, sparse: true });

// --- ATTENDANCE SCHEMA ---
export interface IAttendance extends Document {
  eventId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  registrationNumber: string;
  checkInTime: Date;
  attendanceStatus: 'PRESENT' | 'LATE' | 'ABSENT' | 'CANCELLED';
  deviceMetadata?: string;
  manualRemarks?: string;
  adminId?: mongoose.Types.ObjectId;
  createdAt: Date;
}
const AttendanceSchema = new Schema<IAttendance>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  registrationNumber: { type: String, required: true },
  checkInTime: { type: Date, default: Date.now },
  attendanceStatus: { type: String, enum: ['PRESENT', 'LATE', 'ABSENT', 'CANCELLED'], default: 'PRESENT' },
  deviceMetadata: { type: String },
  manualRemarks: { type: String },
  adminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
});

AttendanceSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

// --- SYSTEM SETTING / WEBSITE CONTENT SCHEMA ---
export interface ISetting extends Document {
  key: string;
  value: any;
  createdAt: Date;
  updatedAt: Date;
}
const SettingSchema = new Schema<ISetting>({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// --- GALLERY SCHEMA ---
export interface IGallery extends Document {
  imageUrl: string;
  caption: string;
  category: string;
  published: boolean;
  createdAt: Date;
}
const GallerySchema = new Schema<IGallery>({
  imageUrl: { type: String, required: true },
  caption: { type: String, required: true },
  category: { type: String, required: true },
  published: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Avoid Mongoose OverwriteModelError
export const Admin: Model<IAdmin> = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);
export const Client: Model<IClient> = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);
export const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
export const Student: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
export const Application: Model<IApplication> = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
export const Attendance: Model<IAttendance> = mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
export const Setting: Model<ISetting> = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
export const Gallery: Model<IGallery> = mongoose.models.Gallery || mongoose.model<IGallery>('Gallery', GallerySchema);
