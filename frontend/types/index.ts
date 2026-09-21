export type CancerType = 'skin';

export interface PatientSymptomContext {
  duration?: string;
  changes?: string;
  symptoms?: string[];
}

export interface DiagnosticResult {
  id: number;
  cancer_type: string;
  prediction: string; // 'mel' | 'nv' | 'bcc' | 'akiec' | 'bkl' | 'df' | 'vasc' | 'benign' | 'malignant'
  confidence_score: number;
  probabilities?: Record<string, number>;
  heatmap_image?: string;
  is_potential_non_skin?: boolean;
  image_url: string;
  created_at: string;
  symptom_context?: PatientSymptomContext;
}

export type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export type UrgencyLevel = 'high' | 'moderate' | 'routine';

export interface DiseaseInfo {
  code: string;
  friendlyName: string;
  clinicalName: string;
  urgency: UrgencyLevel;
  type: 'benign' | 'malignant' | 'pre-malignant';
  categoryBadge: string;
  whatIsIt: string;
  recommendedNextStep: string;
  detailedOverview: string;
  visualCharacteristics: string[];
  riskFactors: string[];
  clinicalImportance: string;
  simpleExplanation?: string;
  recommendedAction?: string;
}

export const GENERAL_DOCTOR_QUESTIONS = [
  'Does this spot look like something we should monitor or test further?',
  'Are there specific changes in size, border, or color I should watch for?',
  'How often should I have my skin checked based on my personal skin type?',
];

export const DISEASE_MAP: Record<string, DiseaseInfo> = {
  mel: {
    code: 'mel',
    friendlyName: 'High-Risk Spot / Melanoma',
    clinicalName: 'Melanoma',
    urgency: 'high',
    type: 'malignant',
    categoryBadge: 'High-Risk Lesion',
    whatIsIt: 'This pattern resembles melanoma, a serious form of skin cancer that develops from pigment-producing cells (melanocytes).',
    recommendedNextStep: 'See a dermatologist soon to have this spot properly examined with a dermatoscope and evaluated in person.',
    detailedOverview:
      'Melanoma occurs when pigment-producing cells in the epidermis (melanocytes) experience DNA damage—often triggered by UV radiation—and begin multiplying uncontrollably. While it represents a smaller percentage of skin cancer cases, it is the most serious form because of its potential to spread (metastasize) to other organs if not detected and removed early.',
    visualCharacteristics: [
      'Asymmetry: One half of the spot does not match the other half in shape or color.',
      'Irregular Borders: The edges are often notched, scalloped, blurred, or poorly defined.',
      'Color Variation: Multiple shades within the same spot, including dark brown, black, tan, pink, blue, or white.',
      'Diameter & Evolution: Often larger than 6mm (pencil eraser size), or noticeably evolving in size, shape, elevation, or sensation (itching/bleeding).',
    ],
    riskFactors: [
      'Intense or blistering sunburns, particularly during childhood and adolescence.',
      'Frequent exposure to ultraviolet (UV) light from natural sunlight or tanning beds.',
      'Having fair skin, light-colored eyes, red or blonde hair, or a high count of moles (>50).',
      'Personal or family history of melanoma or atypical (dysplastic) nevi.',
    ],
    clinicalImportance:
      'When identified and treated in its early localized stages (before penetrating deep layers of the dermis), melanoma has an estimated 5-year survival rate exceeding 99%. An in-person dermatological examination, dermoscopy, and potential excisional biopsy are essential for accurate staging.',
  },
  nv: {
    code: 'nv',
    friendlyName: 'Normal Harmless Mole',
    clinicalName: 'Melanocytic Nevus',
    urgency: 'routine',
    type: 'benign',
    categoryBadge: 'Normal Mole',
    whatIsIt: 'A common, harmless cluster of pigment cells on the skin (a standard mole or birthmark).',
    recommendedNextStep: 'Generally low concern — mention it at your next regular checkup, and watch for any sudden changes.',
    detailedOverview:
      'A melanocytic nevus is a benign, localized proliferation of melanocytes (pigment-producing cells). Almost every adult has between 10 and 40 normal moles across their body. They develop during childhood and young adulthood and typically remain stable, uniform, and harmless throughout life.',
    visualCharacteristics: [
      'Symmetry: Round or oval shape where both halves look roughly identical.',
      'Smooth, Defined Borders: Clear, distinct boundaries separating the mole from surrounding skin.',
      'Uniform Color: Single, consistent tone (usually light tan, medium brown, or flesh-colored).',
      'Stable Size: Typically smaller than 6mm with a flat or evenly raised dome surface.',
    ],
    riskFactors: [
      'Natural genetic predisposition (family tendency to have multiple moles).',
      'Normal sun exposure during early life development.',
      'Hormonal changes during puberty or pregnancy can cause minor uniform darkening.',
    ],
    clinicalImportance:
      'Benign nevi require no medical treatment unless they become chronically irritated by clothing or undergo sudden visual changes (the "ugly duckling" sign) that warrant a routine dermoscopy check.',
  },
  bcc: {
    code: 'bcc',
    friendlyName: 'Basal Cell Skin Spot',
    clinicalName: 'Basal Cell Carcinoma',
    urgency: 'moderate',
    type: 'malignant',
    categoryBadge: 'Doctor Check Advised',
    whatIsIt: 'A very common, highly treatable skin spot that typically grows slowly on sun-exposed areas.',
    recommendedNextStep: 'Worth getting checked by a dermatologist when convenient to discuss appropriate care.',
    detailedOverview:
      'Basal Cell Carcinoma (BCC) is the most common form of skin cancer worldwide. It originates in the basal cells found in the deepest layer of the epidermis. BCC is characteristically very slow-growing and almost never spreads (metastasizes) to distant parts of the body, but it can cause localized tissue damage if left untreated for extended periods.',
    visualCharacteristics: [
      'Pearly or Waxy Bump: Often appears as a translucent, shiny bump with tiny visible blood vessels (telangiectasias).',
      'Non-Healing Sore: A patch or sore that bleeds easily, oozes, crusts over, and fails to heal over several weeks.',
      'Rolled Borders: Raised edges with a slightly sunken or ulcerated central core.',
      'Pink or Reddish Patch: Persistent dry, rough, or shiny patch on the chest, shoulders, or face.',
    ],
    riskFactors: [
      'Cumulative lifetime sun exposure, especially on the face, neck, scalp, ears, and hands.',
      'Fair complexion that burns easily and tans poorly.',
      'History of radiation therapy, tanning bed usage, or older age (>50).',
    ],
    clinicalImportance:
      'BCC is easily curable with simple outpatient dermatological procedures (such as minor excision, curettage, cryotherapy, or Mohs micrographic surgery) when addressed promptly before it expands locally.',
  },
  akiec: {
    code: 'akiec',
    friendlyName: 'Rough Sun Spot / Pre-Cancer',
    clinicalName: 'Actinic Keratosis / IEC',
    urgency: 'moderate',
    type: 'pre-malignant',
    categoryBadge: 'Pre-Cancerous Spot',
    whatIsIt: 'A rough, scaly patch on sun-damaged skin that is beneficial to address early.',
    recommendedNextStep: 'Worth getting checked by a dermatologist when convenient for simple evaluation and treatment.',
    detailedOverview:
      'Actinic Keratosis (AK) and Intraepithelial Carcinoma (IEC / Bowen\'s Disease) are pre-cancerous, superficial lesions resulting from cumulative UV radiation damage to epidermal keratinocytes. While most AKs remain superficial, a small percentage can gradually progress into invasive squamous cell carcinoma if left untreated.',
    visualCharacteristics: [
      'Sandpaper Texture: A rough, dry, gritty, or scaly surface that is often felt before it is clearly seen.',
      'Reddish, Pink, or Brown Tint: Slightly discolored flat or mildly thickened patch.',
      'Sticking Horn or Crust: Occasionally forms a small hard, wart-like crust on sun-exposed skin.',
      'Mild Sensitivity: May itch, burn, or feel tender when touched or rubbed against clothing.',
    ],
    riskFactors: [
      'Extensive lifetime sun exposure or outdoor occupations (construction, farming, landscaping).',
      'Age over 40 and fair skin types with a history of frequent sun exposure.',
      'Immunosuppression or history of severe sunburns.',
    ],
    clinicalImportance:
      'Treating Actinic Keratosis is straightforward, fast, and highly effective—often done in a doctor\'s office via liquid nitrogen cryotherapy, topical creams, or photodynamic therapy.',
  },
  bkl: {
    code: 'bkl',
    friendlyName: 'Harmless Age / Wisdom Spot',
    clinicalName: 'Benign Keratosis',
    urgency: 'routine',
    type: 'benign',
    categoryBadge: 'Harmless Growth',
    whatIsIt: 'A harmless, non-cancerous skin mark (like an age spot, sun mark, or seborrheic keratosis).',
    recommendedNextStep: 'Generally low concern — mention it at your next regular checkup if it becomes irritated.',
    detailedOverview:
      'Benign Keratoses include seborrheic keratoses, solar lentigines (age/liver spots), and lichen-planus-like keratoses. These are completely benign, non-cancerous overgrowths of surface skin cells that naturally increase in frequency as individuals age. They have zero malignant potential.',
    visualCharacteristics: [
      '"Stuck-on" Appearance: Looks like a drop of warm candle wax or a barnacle sitting on the surface of the skin.',
      'Waxy, Scaly, or Crusted Surface: Slightly raised texture that can range from smooth to warty.',
      'Color Spectrum: Ranges from light tan and yellow to dark brown or near-black.',
      'Well-Defined Borders: Distinct edges that clearly separate the lesion from normal skin.',
    ],
    riskFactors: [
      'Natural aging process (very common after age 40–50).',
      'Genetic factors and family history of multiple wisdom spots.',
      'Chronic cumulative sun exposure (for solar lentigines).',
    ],
    clinicalImportance:
      'Benign keratoses do not require medical removal unless they become caught on jewelry, itch from friction, or bleed due to scratching. If their dark appearance causes aesthetic concern, a doctor can easily confirm their benign nature.',
  },
  df: {
    code: 'df',
    friendlyName: 'Harmless Skin Bump',
    clinicalName: 'Dermatofibroma',
    urgency: 'routine',
    type: 'benign',
    categoryBadge: 'Harmless Nodule',
    whatIsIt: 'A firm, safe bump that often forms after minor skin irritation, an ingrown hair, or an insect bite.',
    recommendedNextStep: 'Generally low concern — mention it at your next regular checkup if you have any questions.',
    detailedOverview:
      'A dermatofibroma is a benign, fibrous histiocytoma (a firm, non-cancerous growth of fibrous connective tissue in the dermis). They are very common, safe, and typically arise following a minor localized skin trauma, such as an insect bite, puncture, or shaving nick.',
    visualCharacteristics: [
      'Firm, Button-Like Feel: Feels like a small, hard pea or button embedded just beneath the skin surface.',
      'The "Pinch Sign" (Dimpling): When squeezed gently from the sides, the bump tends to dimple downward into the skin.',
      'Color: Usually brownish-pink, dull red, or hyperpigmented compared to surrounding skin.',
      'Location: Most commonly found on the lower legs, arms, or upper back in young to middle-aged adults.',
    ],
    riskFactors: [
      'History of insect bites, splinters, or minor skin punctures.',
      'More frequent in women and young to middle-aged adults.',
    ],
    clinicalImportance:
      'Dermatofibromas are completely harmless and rarely change once formed. No medical treatment is necessary unless a lesion is symptomatic, painful, or causing discomfort.',
  },
  vasc: {
    code: 'vasc',
    friendlyName: 'Harmless Blood Vessel Mark',
    clinicalName: 'Vascular Lesion / Angioma',
    urgency: 'routine',
    type: 'benign',
    categoryBadge: 'Harmless Blood Spot',
    whatIsIt: 'A benign, normal collection of tiny blood vessels (such as a cherry angioma, pyogenic granuloma, or harmless red spot).',
    recommendedNextStep: 'Generally low concern — mention it at your next regular checkup, especially if it bleeds or changes.',
    detailedOverview:
      'Vascular lesions (such as cherry angiomas, hemangiomas, or spider angiomas) are benign collections of proliferating, dilated blood vessels in the skin. They appear as vivid red, purple, or blue marks and are exceedingly common in adults of all ages.',
    visualCharacteristics: [
      'Bright Red to Purple Coloration: Characteristic vivid crimson, ruby red, or bluish hue.',
      'Smooth Dome or Flat Spot: Can be smooth, flat macules or small elevated papules (1–5 mm in size).',
      'Blanching: May momentarily fade (blanch) to white when pressed firmly due to blood displacement.',
      'Tendency to Bleed if Scratched: Because they are rich in capillaries, minor trauma may cause temporary bleeding.',
    ],
    riskFactors: [
      'Normal aging and genetic predisposition (cherry angiomas often multiply after age 30).',
      'Pregnancy and hormonal shifts can increase spider angiomas.',
      'Exposure to certain environmental factors or medications.',
    ],
    clinicalImportance:
      'Vascular skin marks are completely benign and safe. If an angioma bleeds frequently due to shaving or clothing friction, it can be easily removed by a doctor using minor electrocautery, laser therapy, or simple cryosurgery.',
  },
};
