// src/lib/profileCompletion.js
//
// Pure function: given an employee record, returns { percent, missing }.
// Extracted separately from any component so it's directly unit-testable
// (see profileCompletion.test.js) -- this is exactly the kind of "silent
// off-by-one" logic that's easy to get wrong and worth verifying, per the
// design brief's "Profile Completion" requirement (section 3).

// Each entry: [field key on the employee record, human label]. Order
// matters only for the "missing" list's display order, not the math.
export const COMPLETION_FIELDS = [
  ['photo_url', 'Foto'],
  ['phone', 'No. HP'],
  ['institution_email', 'Email Institusi'],
  ['nik', 'NIK'],
  ['tax_number', 'NPWP'],
  ['address', 'Alamat'],
  ['bank_account_number', 'No. Rekening'],
  ['emergency_contact_name', 'Kontak Darurat'],
  ['jabatan_id', 'Jabatan'],
  ['unit_kerja_id', 'Unit Kerja'],
]

export function computeProfileCompletion(employee) {
  if (!employee) return { percent: 0, missing: COMPLETION_FIELDS.map(([, label]) => label) }
  const missing = []
  let filled = 0
  for (const [key, label] of COMPLETION_FIELDS) {
    const val = employee[key]
    const isFilled = val !== null && val !== undefined && String(val).trim() !== ''
    if (isFilled) filled += 1
    else missing.push(label)
  }
  const percent = Math.round((filled / COMPLETION_FIELDS.length) * 100)
  return { percent, missing }
}
