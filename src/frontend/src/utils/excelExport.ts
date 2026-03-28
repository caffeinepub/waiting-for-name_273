import * as XLSX from "xlsx";

export type DocRow = {
  name: string;
  dob: string;
  aadhaarNo: string;
  panNo: string;
  voterId: string;
  drivingLicenseNo: string;
  passportNo: string;
  passportSizePhoto: string;
  birthCertificate: string;
  insurancePolicy: string;
  rationCard: string;
  marksheet10th: string;
  marksheet12th: string;
  degreeCertificate: string;
  incomeCertificate: string;
  casteCertificate: string;
  medicalRecords: string;
  other: string;
};

export function generateExcel(
  rows: DocRow[],
  filename = "family-documents.xlsx",
) {
  const headers = [
    "Name",
    "DOB",
    "Aadhaar No.",
    "PAN No.",
    "Voter ID",
    "Driving License No.",
    "Passport No.",
    "Passport Size Photo",
    "Birth Certificate",
    "Insurance Policy",
    "Ration Card",
    "10th Marksheet",
    "12th Marksheet",
    "Degree Certificate",
    "Income Certificate",
    "Caste Certificate",
    "Medical Records",
    "Other",
  ];
  const data = [
    headers,
    ...rows.map((r) => [
      r.name,
      r.dob,
      r.aadhaarNo,
      r.panNo,
      r.voterId,
      r.drivingLicenseNo,
      r.passportNo,
      r.passportSizePhoto,
      r.birthCertificate,
      r.insurancePolicy,
      r.rationCard,
      r.marksheet10th,
      r.marksheet12th,
      r.degreeCertificate,
      r.incomeCertificate,
      r.casteCertificate,
      r.medicalRecords,
      r.other,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Family Documents");
  XLSX.writeFile(wb, filename);
}
