export type CellValue = { text: string; url?: string };

export type DocRow = {
  name: string;
  dob: string;
  aadhaarNo: CellValue;
  panNo: CellValue;
  voterId: CellValue;
  drivingLicenseNo: CellValue;
  passportNo: CellValue;
  passportSizePhoto: CellValue;
  birthCertificate: CellValue;
  insurancePolicy: CellValue;
  rationCard: CellValue;
  marksheet10th: CellValue;
  marksheet12th: CellValue;
  degreeCertificate: CellValue;
  incomeCertificate: CellValue;
  casteCertificate: CellValue;
  medicalRecords: CellValue;
  other: CellValue;
};

// Dynamically load xlsx from CDN
function loadXlsx(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).XLSX) {
      resolve((window as any).XLSX);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error("Failed to load xlsx"));
    document.head.appendChild(script);
  });
}

export async function generateExcel(
  rows: DocRow[],
  filename = "family-documents.xlsx",
): Promise<void> {
  const XLSX = await loadXlsx();

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

  const cellValues = rows.map((r) => [
    r.name,
    r.dob,
    r.aadhaarNo.text,
    r.panNo.text,
    r.voterId.text,
    r.drivingLicenseNo.text,
    r.passportNo.text,
    r.passportSizePhoto.text,
    r.birthCertificate.text,
    r.insurancePolicy.text,
    r.rationCard.text,
    r.marksheet10th.text,
    r.marksheet12th.text,
    r.degreeCertificate.text,
    r.incomeCertificate.text,
    r.casteCertificate.text,
    r.medicalRecords.text,
    r.other.text,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...cellValues]);

  // Add hyperlinks to "Uploaded" cells
  const docFields: CellValue[][] = rows.map((r) => [
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
  ]);

  docFields.forEach((rowFields, rowIdx) => {
    rowFields.forEach((cell, fieldIdx) => {
      if (cell.text === "Uploaded" && cell.url) {
        const colIdx = fieldIdx + 2; // name=0, dob=1, doc fields start at 2
        const excelRowIdx = rowIdx + 1; // +1 for header row
        const cellAddr = XLSX.utils.encode_cell({ r: excelRowIdx, c: colIdx });
        if (ws[cellAddr]) {
          ws[cellAddr].l = { Target: cell.url, Tooltip: "View document" };
        }
      }
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Family Documents");
  XLSX.writeFile(wb, filename);
}
