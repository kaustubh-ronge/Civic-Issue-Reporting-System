'use client'

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { MapPin, Loader2, Search, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce" 

export default function LocationSearch({ onLocationSelect }) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)

    // Wait 500ms after typing stops before calling API
    const debouncedQuery = useDebounce(query, 500)

    // Close dropdown if clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        async function fetchLocations() {
            // Don't search for empty or very short strings
            if (!debouncedQuery || debouncedQuery.length < 3) {
                setResults([])
                return
            }

            setLoading(true)
            try {
                // Call OpenStreetMap API (Free, No Key required)
                // We limit to 5 results to keep UI clean
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}&limit=5`
                )
                const data = await res.json()
                setResults(data)
                setIsOpen(true)
            } catch (error) {
                console.error("Location search failed", error)
            } finally {
                setLoading(false)
            }
        }

        fetchLocations()
    }, [debouncedQuery])

    const handleSelect = (location) => {
        setQuery(location.display_name)
        setIsOpen(false)
        // Send data back to the parent form
        onLocationSelect({
            lat: location.lat,
            lon: location.lon,
            address: location.display_name
        })
    }

    const clearSearch = () => {
        setQuery("")
        setResults([])
        onLocationSelect(null) // Reset parent state
    }

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input 
                    placeholder="Search specific area, street, or landmark..." 
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    className="pl-10 pr-10 h-12 bg-white border-slate-200 focus:border-orange-500 transition-all shadow-sm"
                />
                
                {/* Loading Spinner or Clear Button */}
                <div className="absolute right-3 top-3">
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                    ) : query ? (
                        <button onClick={clearSearch} type="button">
                            <X className="h-5 w-5 text-slate-400 hover:text-red-500 transition-colors" />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && (
                <Card className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto shadow-xl border-2 border-orange-400 bg-white animate-in fade-in zoom-in-95 duration-200">
                    <ul className="py-1">
                        {results.map((item) => (
                            <li 
                                key={item.place_id}
                                onClick={() => handleSelect(item)}
                                className="px-4 py-3 hover:bg-orange-100 cursor-pointer flex items-start gap-3 transition-colors border-b border-slate-200 last:border-0 active:bg-orange-200"
                            >
                                <MapPin className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                                <span className="text-sm text-slate-900 font-medium leading-snug">
                                    {item.display_name}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    )
}