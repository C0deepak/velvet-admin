import z from 'zod'

export enum ChauffeurGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

export enum AccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
}

const req = (label: string) =>
  z.preprocess((v) => (v == null ? '' : v), z.string().min(1, `${label} is required`))

const addressSchema = z.object({
  houseNo: req('House / flat number'),
  street: req('Street'),
  city: req('City'),
  state: req('State'),
  pincode: req('Pincode'),
  country: req('Country'),
})

const documentsSchema = z.object({
  aadharCardNo: req('Aadhaar card number'),
  aadharCardFront: req('Aadhaar card front'),
  aadharCardBack: req('Aadhaar card back'),
  panCardNo: z.string().nullable(),
  panCard: z.string().nullable(),
  license: z.string().nullable(),
  policeVerification: z.string().nullable(),
  medicalCertificate: z.string().nullable(),
  chauffeurPhoto: z.string().nullable(),
  bgvCheck: z.string().nullable(),
})

const bankDetailsSchema = z.object({
  accountHolderName: req('Account holder name'),
  accountNumber: req('Account number'),
  ifscCode: req('IFSC code'),
  bankName: req('Bank name'),
  accountType: z.enum(AccountType),
})

const metadataSchema = z.object({
  workingHoursStart: req('Working start time'),
  workingHoursEnd: req('Working end time'),
  drivingStartYear: z.number().min(1950, 'Enter a valid year (1950 or later)'),
  luxuryDrivingStartYear: z.number().min(1950, 'Enter a valid year (1950 or later)'),
  luxuryBrandsDriven: z.string(),
  joiningDate: req('Joining date'),
})

export const chauffeurFormSchema = z.object({
  firstName: req('First name'),
  lastName: req('Last name'),
  email: z.preprocess((v) => (v == null ? '' : v), z.email('Enter a valid email address')),
  phone: z.preprocess(
    (v) => (v == null ? '' : v),
    z.string().min(10, 'Enter a valid 10-digit phone number')
  ),
  countryCode: req('Country code'),
  dateOfBirth: req('Date of birth'),
  dlExpiryDate: req('License expiry date'),
  gender: z.enum(ChauffeurGender),
  licenseNumber: req('License number'),
  maritalStatus: z.enum(MaritalStatus),
  hasCriminalRecord: z.boolean(),
  address: z.object({
    currentAddress: addressSchema,
    permanentAddress: addressSchema,
  }),
  documents: documentsSchema,
  bankDetails: bankDetailsSchema,
  metadata: metadataSchema,
})

export type TChauffeurFormValues = z.infer<typeof chauffeurFormSchema>
