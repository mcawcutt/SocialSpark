import * as XLSX from 'xlsx';

export interface RetailPartnerTemplate {
  name: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  tags: string;  // Comma-separated list
  notes: string;
}

// Creates a template file for retail partners bulk upload
export function createRetailPartnersTemplate(): Blob {
  // Define the worksheet data with headers and example data
  const wsData = [
    [
      'Name',
      'Status',
      'Contact Name',
      'Contact Email',
      'Contact Phone',
      'Address',
      'City',
      'State',
      'Zip',
      'Country',
      'Tags',
      'Notes'
    ],
    [
      'Example Store #1',
      'active',
      'John Doe',
      'john@examplestore.com',
      '555-123-4567',
      '123 Main St',
      'Springfield',
      'IL',
      '62701',
      'USA',
      'urban, premium, flagship',
      'This is a flagship store with premium products'
    ],
    [
      'Example Store #2',
      'pending',
      'Jane Smith',
      'jane@secondstore.com',
      '555-987-6543',
      '456 Oak Ave',
      'Riverdale',
      'CA',
      '90210',
      'USA',
      'suburban, outdoor',
      'New store opening next month'
    ]
  ];

  // Create a worksheet from the data
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 20 }, // Name
    { wch: 10 }, // Status
    { wch: 20 }, // Contact Name
    { wch: 25 }, // Contact Email
    { wch: 15 }, // Contact Phone
    { wch: 30 }, // Address
    { wch: 15 }, // City
    { wch: 10 }, // State
    { wch: 10 }, // Zip
    { wch: 15 }, // Country
    { wch: 25 }, // Tags
    { wch: 40 }, // Notes
  ];
  ws['!cols'] = colWidths;

  // Create a new workbook and append the worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Retail Partners');

  // Generate the file as a blob
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Parse an Excel file containing retail partners data
export function parseRetailPartnersExcel(file: ArrayBuffer): RetailPartnerTemplate[] {
  // Read the Excel file
  const workbook = XLSX.read(file, { type: 'array' });
  
  // Get the first worksheet
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Convert the worksheet to JSON
  const data = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
  
  // Skip the header row and map the data to our template format
  const partners: RetailPartnerTemplate[] = [];
  
  // Check if we have at least a header row
  if (data.length < 2) {
    return partners;
  }
  
  // Extract the data rows (skip the header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.length < 1 || !row[0]) continue; // Skip empty rows
    
    const partner: RetailPartnerTemplate = {
      name: row[0] || '',
      status: row[1] || 'pending',
      contactName: row[2] || '',
      contactEmail: row[3] || '',
      contactPhone: row[4] || '',
      address: row[5] || '',
      city: row[6] || '',
      state: row[7] || '',
      zip: row[8] || '',
      country: row[9] || '',
      tags: row[10] || '',
      notes: row[11] || ''
    };
    
    partners.push(partner);
  }
  
  return partners;
}