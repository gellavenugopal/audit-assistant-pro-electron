export interface IndianState {
  name: string;
  gstCode: number;
}

export const INDIAN_STATES: IndianState[] = [
  { name: 'Jammu & Kashmir', gstCode: 1 },
  { name: 'Himachal Pradesh', gstCode: 2 },
  { name: 'Punjab', gstCode: 3 },
  { name: 'Chandigarh', gstCode: 4 },
  { name: 'Uttarakhand', gstCode: 5 },
  { name: 'Haryana', gstCode: 6 },
  { name: 'Delhi', gstCode: 7 },
  { name: 'Rajasthan', gstCode: 8 },
  { name: 'Uttar Pradesh', gstCode: 9 },
  { name: 'Bihar', gstCode: 10 },
  { name: 'Sikkim', gstCode: 11 },
  { name: 'Arunachal Pradesh', gstCode: 12 },
  { name: 'Nagaland', gstCode: 13 },
  { name: 'Manipur', gstCode: 14 },
  { name: 'Mizoram', gstCode: 15 },
  { name: 'Tripura', gstCode: 16 },
  { name: 'Meghalaya', gstCode: 17 },
  { name: 'Assam', gstCode: 18 },
  { name: 'West Bengal', gstCode: 19 },
  { name: 'Jharkhand', gstCode: 20 },
  { name: 'Odisha', gstCode: 21 },
  { name: 'Chhattisgarh', gstCode: 22 },
  { name: 'Madhya Pradesh', gstCode: 23 },
  { name: 'Gujarat', gstCode: 24 },
  { name: 'Daman & Diu', gstCode: 25 },
  { name: 'Dadra & Nagar Haveli', gstCode: 26 },
  { name: 'Maharashtra', gstCode: 27 },
  { name: 'Andhra Pradesh (Old)', gstCode: 28 },
  { name: 'Karnataka', gstCode: 29 },
  { name: 'Goa', gstCode: 30 },
  { name: 'Lakshadweep', gstCode: 31 },
  { name: 'Kerala', gstCode: 32 },
  { name: 'Tamil Nadu', gstCode: 33 },
  { name: 'Puducherry', gstCode: 34 },
  { name: 'Andaman & Nicobar Islands', gstCode: 35 },
  { name: 'Telangana', gstCode: 36 },
  { name: 'Andhra Pradesh (New)', gstCode: 37 },
  { name: 'Ladakh', gstCode: 38 },
  { name: 'Other Territory', gstCode: 97 },
  { name: 'Central Jurisdiction', gstCode: 99 },
  { name: 'Outside India', gstCode: 100 },
];

export const getStateByName = (name: string): IndianState | undefined => {
  return INDIAN_STATES.find(s => s.name === name);
};

export const getStateByGstCode = (code: number): IndianState | undefined => {
  return INDIAN_STATES.find(s => s.gstCode === code);
};
