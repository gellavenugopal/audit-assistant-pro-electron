import * as XLSX from 'xlsx';
import { INDIAN_STATES } from '@/data/indianStates';

export const downloadClientTemplate = () => {
  const templateData = [
    {
      'Client Name': 'ABC Corporation Ltd',
      'Industry': 'Manufacturing',
      'Contact Person': 'John Doe',
      'Contact Email': 'john@abc.com',
      'Phone Number': '+91 98765 43210',
      'Address': '123 Business Park, Mumbai',
      'PAN': 'ABCDE1234F',
      'CIN': 'U12345MH2020PLC123456',
      'State': 'Maharashtra',
      'PIN': '400001',
    },
    {
      'Client Name': 'XYZ Industries',
      'Industry': 'Technology',
      'Contact Person': 'Jane Smith',
      'Contact Email': 'jane@xyz.com',
      'Phone Number': '+91 87654 32109',
      'Address': '456 Tech Hub, Bangalore',
      'PAN': 'XYZAB5678C',
      'CIN': 'L67890KA2019PLC654321',
      'State': 'Karnataka',
      'PIN': '560001',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clients');
  
  // Add notes about mandatory fields and valid states
  const notesData = [
    { 'Notes': 'Mandatory Fields: Client Name, Industry' },
    { 'Notes': 'All other fields are optional' },
    { 'Notes': '' },
    { 'Notes': 'Valid States (use exact name from this list):' },
  ];
  INDIAN_STATES.forEach(state => {
    notesData.push({ 'Notes': `${state.name} (GST Code: ${state.gstCode})` });
  });
  const notesWs = XLSX.utils.json_to_sheet(notesData);
  XLSX.utils.book_append_sheet(wb, notesWs, 'Notes');
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Client Name
    { wch: 20 }, // Industry
    { wch: 20 }, // Contact Person
    { wch: 25 }, // Contact Email
    { wch: 18 }, // Phone Number
    { wch: 35 }, // Address
    { wch: 12 }, // PAN
    { wch: 25 }, // CIN
    { wch: 25 }, // State
    { wch: 8 },  // PIN
  ];

  XLSX.writeFile(wb, 'client_import_template.xlsx');
};

export const downloadTeamTemplate = () => {
  const templateData = [
    {
      'Full Name': 'John Doe',
      'Email': 'john@example.com',
      'Phone': '+91 98765 43210',
      'Role': 'staff',
    },
    {
      'Full Name': 'Jane Smith',
      'Email': 'jane@example.com',
      'Phone': '+91 87654 32109',
      'Role': 'senior',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Team Members');
  
  // Add notes about valid roles
  const notesData = [
    { 'Notes': 'Valid Roles: partner, manager, senior, staff, viewer' },
    { 'Notes': 'Phone number is optional but recommended for WhatsApp integration' },
  ];
  const notesWs = XLSX.utils.json_to_sheet(notesData);
  XLSX.utils.book_append_sheet(wb, notesWs, 'Notes');

  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Full Name
    { wch: 30 }, // Email
    { wch: 20 }, // Phone
    { wch: 15 }, // Role
  ];

  XLSX.writeFile(wb, 'team_import_template.xlsx');
};

export interface ParsedClient {
  name: string;
  industry: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  pan: string | null;
  cin: string | null;
  state: string | null;
  pin: string | null;
}

export interface ParsedTeamMember {
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
}

export const parseClientExcel = (file: File): Promise<ParsedClient[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const clients: ParsedClient[] = jsonData.map((row: any) => ({
          name: row['Client Name']?.toString().trim() || '',
          industry: row['Industry']?.toString().trim() || '',
          contact_person: row['Contact Person']?.toString().trim() || null,
          contact_email: row['Contact Email']?.toString().trim() || null,
          contact_phone: row['Phone Number']?.toString().trim() || null,
          address: row['Address']?.toString().trim() || null,
          pan: row['PAN']?.toString().trim()?.toUpperCase() || null,
          cin: row['CIN']?.toString().trim()?.toUpperCase() || null,
          state: row['State']?.toString().trim() || null,
          pin: row['PIN']?.toString().trim() || null,
        })).filter(c => c.name && c.industry);

        resolve(clients);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};

export const parseTeamExcel = (file: File): Promise<ParsedTeamMember[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const validRoles = ['partner', 'manager', 'senior', 'staff', 'viewer'];
        
        const members: ParsedTeamMember[] = jsonData.map((row: any) => ({
          full_name: row['Full Name']?.toString().trim() || '',
          email: row['Email']?.toString().trim() || '',
          phone: row['Phone']?.toString().trim() || null,
          role: validRoles.includes(row['Role']?.toString().toLowerCase().trim()) 
            ? row['Role'].toString().toLowerCase().trim() 
            : 'staff',
        })).filter(m => m.full_name && m.email);

        resolve(members);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};
