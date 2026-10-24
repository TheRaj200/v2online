// Service catalog types & dropdown presets (Redux servicesSlice + pages dono use karte hain)

export type FormFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file';
export type DocUploaderRole = 'shop' | 'operator';

export const DROPDOWN_PRESETS = {
  custom: { name: '✏️ Custom Defined Options', options: [] as string[] },
  mp_districts: {
    name: '🏙️ MP All 55 Districts',
    options: [
      'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur',
      'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda',
      'Hoshangabad (Narmadapuram)', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur',
      'Mauganj', 'Maihar', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari', 'Pandhurna', 'Panna', 'Raisen', 'Rajgarh',
      'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri',
      'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'
    ]
  },
  gender: {
    name: '🚻 Gender (Male / Female / Other)',
    options: ['Male', 'Female', 'Transgender']
  },
  caste: {
    name: '📋 Caste Category (General, OBC, SC, ST, EWS)',
    options: ['General (UR)', 'OBC', 'SC', 'ST', 'EWS']
  },
  indian_states: {
    name: '🗺️ Indian States (MP, UP, Rajasthan, etc.)',
    options: ['Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 'Maharashtra', 'Gujarat', 'Chhattisgarh', 'Bihar', 'Delhi', 'Other']
  }
};

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For 'select' dropdown
  presetType?: string; // 'custom' | 'mp_districts' | 'gender' | 'caste' | 'indian_states'
  docUploader?: DocUploaderRole; // For 'file' doc upload: 'shop' (applicant) or 'operator' (response)
  helpText?: string;
}

export interface SubServiceItem {
  id: string;
  name: string;
  code: string;
  iconUrl?: string;
  fee: number; // Price in ₹
  adminCommissionPercent: number; // Admin commission in %
  description?: string;
  formFields: FormField[];
  operatorAssignmentMode?: 'single' | 'area_wise' | 'ward_wise';
  isActive?: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  code: string;
  category?: string;
  iconUrl?: string;
  iconName?: string;
  description: string;
  hasSubServices: boolean;
  fee: number; // Price in ₹ (if hasSubServices is false)
  adminCommissionPercent: number; // Admin commission in % (if hasSubServices is false)
  formFields: FormField[]; // Direct form if hasSubServices is false
  subServices: SubServiceItem[]; // Sub-services if hasSubServices is true
  operatorAssignmentMode?: 'single' | 'area_wise' | 'ward_wise';
  isActive: boolean;
  createdAt?: string;
}
