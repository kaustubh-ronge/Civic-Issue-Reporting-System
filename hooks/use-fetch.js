'use client'

import { useState, useCallback } from 'react'
import { validateFormData, validateObject, formatValidationErrors } from '@/lib/validation-schemas'


export function useFetch() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formErrors, setFormErrors] = useState(null)

  const execute = useCallback(async (url, payload, schema, options = {}) => {
    try {
      setLoading(true)
      setError(null)
      setFormErrors(null)

      // Validate payload
      let validation
      if (payload instanceof FormData) {
        validation = await validateFormData(payload, schema)
      } else {
        validation = await validateObject(payload, schema)
      }

      // If validation fails, return early
      if (!validation.success) {
        const formatted = formatValidationErrors(validation.errors)
        setFormErrors(formatted)
        setError('Validation failed. Please check your input.')

        return {
          success: false,
          data: null,
          error: 'Validation failed',
          formErrors: formatted,
        }
      }

      // Make API request
      const requestOptions = {
        method: options.method || 'POST',
        headers: options.headers || {},
        ...options,
      }

      // Handle FormData vs JSON
      if (payload instanceof FormData) {
        requestOptions.body = payload
        // Don't set Content-Type for FormData, browser will set it with boundary
      } else {
        requestOptions.body = JSON.stringify(validation.data)
        requestOptions.headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(url, requestOptions)

      // Parse response
      const responseData = await response.json()

      if (!response.ok) {
        const errorMessage = responseData.error || `API error: ${response.status}`
        setError(errorMessage)

        return {
          success: false,
          data: null,
          error: errorMessage,
          formErrors: responseData.errors || null,
        }
      }

      // Success
      setData(responseData)

      return {
        success: true,
        data: responseData,
        error: null,
        formErrors: null,
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred'
      setError(errorMessage)

      return {
        success: false,
        data: null,
        error: errorMessage,
        formErrors: null,
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setFormErrors(null)
  }, [])

  return {
    execute,
    reset,
    data,
    loading,
    error,
    formErrors,
  }
}

/**
 * Hook for GET requests with validation
 */
export function useFetchGet() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (url, schema, params = {}) => {
    try {
      setLoading(true)
      setError(null)

      // Validate params if schema provided
      if (schema) {
        const validation = await validateObject(params, schema)

        if (!validation.success) {
          const formatted = formatValidationErrors(validation.errors)
          setError('Validation failed. Please check your input.')

          return {
            success: false,
            data: null,
            error: 'Validation failed',
          }
        }
      }

      // Build URL with query params
      const queryString = new URLSearchParams(params).toString()
      const fullUrl = queryString ? `${url}?${queryString}` : url

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const responseData = await response.json()

      if (!response.ok) {
        const errorMessage = responseData.error || `API error: ${response.status}`
        setError(errorMessage)

        return {
          success: false,
          data: null,
          error: errorMessage,
        }
      }

      setData(responseData)

      return {
        success: true,
        data: responseData,
        error: null,
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred'
      setError(errorMessage)

      return {
        success: false,
        data: null,
        error: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return {
    execute,
    reset,
    data,
    loading,
    error,
  }
}

/**
 * Custom hook for simpler API calls without validation
 * Use this when you don't need schema validation
 */
export function useSimpleFetch() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (url, options = {}) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...options,
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP ${response.status}`)
      }

      setData(responseData)
      return { success: true, data: responseData }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  return { execute, data, loading, error }
}