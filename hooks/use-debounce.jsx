import { useEffect, useState } from 'react'

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    // Set the value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup: If the user types again before the delay is over, 
    // clear the timeout and restart.
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}