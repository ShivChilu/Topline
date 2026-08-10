const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'admin', 'events', 'create', 'page.tsx');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace handleSubmit payload mapping to use fallbacks
  const oldPayload = `    const eventPayload = {
      name,
      date,
      location,
      googleMapsUrl,
      reportingTime,
      startTime,
      endTime,
      workType,
      description,
      instructions,
      dressCode,
      dosAndDonts,
      workersRequired: Number(workersRequired),
      maxApplications: Number(maxApplications),
      paymentPerStudent: Number(paymentPerStudent),
      clientRevenue: Number(clientRevenue),
      otherExpenses: Number(otherExpenses),
      clientId: clientId || null,
      customFormFields: customFields,
      visibility,
    };`;

  const newPayload = `    const defaultDate = date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const eventPayload = {
      name: name.trim() || "Draft Event",
      date: defaultDate,
      location: location.trim() || "TBD",
      googleMapsUrl,
      reportingTime: reportingTime || "00:00",
      startTime: startTime || "00:00",
      endTime: endTime || "00:00",
      workType: workType.trim() || "Catering Staff",
      description: description.trim() || "No description provided.",
      instructions: instructions.trim() || "",
      dressCode: dressCode.trim() || "",
      dosAndDonts,
      workersRequired: Number(workersRequired) || 15,
      maxApplications: Number(maxApplications) || 25,
      paymentPerStudent: Number(paymentPerStudent) || 800,
      clientRevenue: Number(clientRevenue) || 0,
      otherExpenses: Number(otherExpenses) || 0,
      clientId: clientId || null,
      customFormFields: customFields,
      visibility,
    };`;

  content = content.replace(oldPayload, newPayload);

  // 2. Remove "required" HTML validator from the form inputs
  content = content.replace(/required\s*\n\s*value=\{name\}/g, 'value={name}');
  content = content.replace(/required\s*\n\s*value=\{date\}/g, 'value={date}');
  content = content.replace(/required\s*\n\s*value=\{workType\}/g, 'value={workType}');
  content = content.replace(/required\s*\n\s*value=\{reportingTime\}/g, 'value={reportingTime}');
  content = content.replace(/required\s*\n\s*value=\{startTime\}/g, 'value={startTime}');
  content = content.replace(/required\s*\n\s*value=\{endTime\}/g, 'value={endTime}');
  content = content.replace(/required\s*\n\s*value=\{location\}/g, 'value={location}');
  content = content.replace(/required\s*\n\s*value=\{description\}/g, 'value={description}');
  content = content.replace(/required\s*\n\s*value=\{workersRequired\}/g, 'value={workersRequired}');
  content = content.replace(/required\s*\n\s*value=\{maxApplications\}/g, 'value={maxApplications}');
  content = content.replace(/required\s*\n\s*value=\{paymentPerStudent\}/g, 'value={paymentPerStudent}');

  // 3. Remove asterisks (*) from UI labels indicating required status
  content = content.replace(/Event Name \*/g, 'Event Name (Optional)');
  content = content.replace(/Event Date \*/g, 'Event Date (Optional)');
  content = content.replace(/Work Type \/ Category \*/g, 'Work Type / Category (Optional)');
  content = content.replace(/Reporting Time \*/g, 'Reporting Time (Optional)');
  content = content.replace(/Duty Start Time \*/g, 'Duty Start Time (Optional)');
  content = content.replace(/Duty End Time \*/g, 'Duty End Time (Optional)');
  content = content.replace(/Location Details \*/g, 'Location Details (Optional)');
  content = content.replace(/Event Description \*/g, 'Event Description (Optional)');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("SUCCESS: Replaced form required logic successfully!");
} else {
  console.log("File not found:", filePath);
}
