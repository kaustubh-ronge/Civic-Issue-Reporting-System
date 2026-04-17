'use client'

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export default function LeafletLocationMap({ latitude, longitude, className = "" }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        async function initMap() {
            if (!mapRef.current || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

            const L = (await import("leaflet")).default;
            if (!isMounted || !mapRef.current) return;

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const map = L.map(mapRef.current, {
                center: [latitude, longitude],
                zoom: 15,
                zoomControl: true
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap contributors"
            }).addTo(map);

            L.marker([latitude, longitude]).addTo(map);
            mapInstanceRef.current = map;
        }

        initMap();

        return () => {
            isMounted = false;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [latitude, longitude]);

    return <div ref={mapRef} className={className} />;
}
