import { z } from 'zod'

// ============================================
// REPORT CREATION SCHEMAS
// ============================================

export const createReportSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim(),

  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters')
    .trim(),

  cityId: z.string()
    .min(1, 'City ID is required')
    .trim(),

  departmentId: z.string()
    .min(1, 'Department ID is required')
    .trim(),

  address: z.string()
    .max(500, 'Address must not exceed 500 characters')
    .optional()
    .nullable(),

  category: z.string()
    .min(3, 'Category must be at least 3 characters')
    .max(100, 'Category must not exceed 100 characters')
    .trim(),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .optional()
    .default('MEDIUM'),

  latitude: z.preprocess((value) => {
    if (typeof value === 'string' && value !== '') return Number(value)
    return value
  }, z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .nullable()
    .optional()),

  longitude: z.preprocess((value) => {
    if (typeof value === 'string' && value !== '') return Number(value)
    return value
  }, z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .nullable()
    .optional()),

  tags: z.preprocess((value) => {
    if (value === undefined || value === null) return []
    return Array.isArray(value) ? value : [value]
  }, z.array(z.string().min(1).max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([])),

  aiImage: z.string()
    .optional()
    .nullable(),

  images: z.preprocess((value) => {
    if (value === undefined || value === null) return []
    return Array.isArray(value) ? value : [value]
  }, z.array(z.any().refine((val) => val && typeof val.arrayBuffer === 'function', 'Expected a valid file'))
    .max(5, 'Maximum 5 images allowed')
    .optional()
    .default([])),

  videos: z.preprocess((value) => {
    if (value === undefined || value === null) return []
    return Array.isArray(value) ? value : [value]
  }, z.array(z.any().refine((val) => val && typeof val.arrayBuffer === 'function', 'Expected a valid file'))
    .max(2, 'Maximum 2 videos allowed')
    .optional()
    .default([])),
})

export const createMobileReportSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim(),

  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters')
    .trim(),

  cityId: z.string()
    .min(1, 'City ID is required')
    .trim(),

  departmentId: z.string()
    .min(1, 'Department ID is required')
    .trim(),

  lat: z.preprocess((value) => {
    if (typeof value === 'string' && value !== '') return Number(value)
    return value
  }, z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')),

  lng: z.preprocess((value) => {
    if (typeof value === 'string' && value !== '') return Number(value)
    return value
  }, z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')),

  address: z.string()
    .max(500, 'Address must not exceed 500 characters')
    .optional()
    .nullable(),

  category: z.string()
    .min(3, 'Category must be at least 3 characters')
    .max(100, 'Category must not exceed 100 characters')
    .trim(),

  customCategory: z.string()
    .max(100, 'Custom category must not exceed 100 characters')
    .optional()
    .nullable(),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'AUTO'])
    .optional()
    .default('MEDIUM'),

  tags: z.preprocess((value) => {
    if (value === undefined || value === null) return []
    return Array.isArray(value) ? value : [value]
  }, z.array(z.string().min(1).max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([])),

  aiImage: z.string()
    .optional()
    .nullable(),

  images: z.preprocess((value) => {
    if (value === undefined || value === null) return []
    return Array.isArray(value) ? value : [value]
  }, z.array(z.any().refine((val) => val && typeof val.arrayBuffer === 'function', 'Expected a valid file'))
    .max(5, 'Maximum 5 images allowed')
    .optional()
    .default([])),

  muxVideoIds: z.preprocess((value) => {
    if (value === undefined || value === null) return []
    return Array.isArray(value) ? value : [value]
  }, z.array(z.string())
    .max(2, 'Maximum 2 videos allowed')
    .optional()
    .default([])),
})

// ============================================
// REPORT ACTION SCHEMAS
// ============================================

export const confirmResolutionSchema = z.object({
  reportId: z.string()
    .min(1, 'Report ID is required'),
})

export const reopenReportSchema = z.object({
  reportId: z.string()
    .min(1, 'Report ID is required'),

  reason: z.string()
    .max(1000, 'Reason must not exceed 1000 characters')
    .optional()
    .nullable(),
})

export const getReportByReportIdSchema = z.object({
  reportId: z.string()
    .min(1, 'Report ID is required'),
})

// ============================================
// VIDEO SCHEMA
// ============================================

export const getVideoUrlSchema = z.object({
  videoId: z.string()
    .min(1, 'Video ID is required')
    .trim(),
})

// ============================================
// AUDIO SCHEMA
// ============================================

export const processAudioSubmissionSchema = z.object({
  audio: z.any()
    .refine((val) => val && typeof val.arrayBuffer === 'function', 'Expected a valid audio file')
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      'Audio file must not exceed 10MB'
    )
    .refine(
      (file) => ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg'].includes(file.type),
      'Audio must be in MP3, WAV, M4A, or OGG format'
    ),
})

// ============================================
// ADMIN SCHEMAS
// ============================================

export const updateAdminProfileSchema = z.object({
  stateName: z.string()
    .min(2, 'State name must be at least 2 characters')
    .max(100, 'State name must not exceed 100 characters')
    .trim(),

  city: z.string()
    .min(2, 'City name must be at least 2 characters')
    .max(100, 'City name must not exceed 100 characters')
    .trim(),

  department: z.string()
    .min(2, 'Department name must be at least 2 characters')
    .max(100, 'Department name must not exceed 100 characters')
    .trim(),

  name: z.string()
    .min(3, 'Full name must be at least 3 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .trim(),

  designation: z.string()
    .min(2, 'Designation must be at least 2 characters')
    .max(50, 'Designation must not exceed 50 characters')
    .optional()
    .nullable(),

  employeeId: z.string()
    .min(1, 'Employee ID is required')
    .max(50, 'Employee ID must not exceed 50 characters')
    .optional()
    .nullable(),

  phone: z.string()
    .min(10, 'Phone number must be at least 10 characters')
    .max(20, 'Phone number must not exceed 20 characters')
    .optional()
    .nullable(),
})

export const updateReportStatusSchema = z.object({
  reportId: z.string()
    .min(1, 'Report ID is required'),

  newStatus: z.enum(['PENDING', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'RESOLVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Invalid status value' })
  }),

  adminNote: z.string()
    .max(2000, 'Admin note must not exceed 2000 characters')
    .optional()
    .nullable(),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    errorMap: () => ({ message: 'Invalid priority value' })
  })
    .optional()
    .nullable(),

  estimatedCost: z.number()
    .min(0, 'Estimated cost must be a positive number')
    .max(9999999, 'Estimated cost too high')
    .optional()
    .nullable(),
})

export const verifyReportSchema = z.object({
  reportId: z.string()
    .min(1, 'Report ID is required'),
})

// ============================================
// UTILITY & ANALYTICS SCHEMAS
// ============================================

export const getDepartmentsByCitySchema = z.object({
  cityId: z.string()
    .min(1, 'City ID is required')
    .trim(),
})

export const getAreaReportCountsSchema = z.object({
  cityId: z.string()
    .min(1, 'City ID is required')
    .trim(),

  category: z.string()
    .max(100, 'Category must not exceed 100 characters')
    .optional()
    .nullable(),
})

export const getReportsByAreaSchema = z.object({
  areaId: z.string()
    .min(1, 'Area ID is required')
    .trim(),

  category: z.string()
    .max(100, 'Category must not exceed 100 characters')
    .optional()
    .nullable(),
})

// ============================================
// GENERIC VALIDATION HELPERS
// ============================================

/**
 * Validates FormData against a Zod schema
 * Converts FormData to object, handles File objects
 */
export const validateFormData = async (formData, schema) => {
  try {
    const obj = {}

    // Convert FormData to plain object
    for (const [key, value] of formData.entries()) {
      if (obj[key]) {
        // Handle multiple values (arrays)
        if (!Array.isArray(obj[key])) {
          obj[key] = [obj[key]]
        }
        obj[key].push(value)
      } else {
        obj[key] = value
      }
    }

    // Parse with schema
    const validated = await schema.parseAsync(obj)

    return {
      success: true,
      data: validated,
      errors: null,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.flatten().fieldErrors,
      }
    }

    return {
      success: false,
      data: null,
      errors: { general: [error.message] },
    }
  }
}

/**
 * Validates plain object against a Zod schema
 */
export const validateObject = async (obj, schema) => {
  try {
    const validated = await schema.parseAsync(obj)

    return {
      success: true,
      data: validated,
      errors: null,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.flatten().fieldErrors,
      }
    }

    return {
      success: false,
      data: null,
      errors: { general: [error.message] },
    }
  }
}

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors) => {
  if (!errors) return null

  const formatted = {}

  for (const [field, messages] of Object.entries(errors)) {
    formatted[field] = Array.isArray(messages) ? messages[0] : messages
  }

  return formatted
}