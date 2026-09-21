'use client';

import React, { useState } from 'react';
import { MapPin, Search, ExternalLink, Globe, Navigation, RefreshCw, Building2, ShieldCheck, Stethoscope, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Clinic {
  id: string;
  name: string;
  address: string;
  distance?: string;
  lat: number;
  lon: number;
}

export default function DermatologistLocator() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocationName, setUserLocationName] = useState<string>('');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Search clinics via OpenStreetMap + Google Maps fallback
  const searchNearbyClinics = async (lat: number, lon: number, locationName?: string) => {
    setIsLoading(true);
    setGeoError(null);
    setHasSearched(true);
    setUserLocationName(locationName || 'Your Location');

    try {
      const radius = 0.15; // ~15km bounding box
      const viewbox = `${lon - radius},${lat + radius},${lon + radius},${lat - radius}`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=dermatologist+OR+skin+clinic&viewbox=${viewbox}&bounded=1&limit=6&addressdetails=1`;

      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });

      if (!res.ok) throw new Error('OSM query failed');
      const data = await res.json();

      if (data && data.length > 0) {
        const formatted: Clinic[] = data.map((item: any, idx: number) => {
          const itemLat = parseFloat(item.lat);
          const itemLon = parseFloat(item.lon);
          const dLat = (itemLat - lat) * 111;
          const dLon = (itemLon - lon) * 111 * Math.cos((lat * Math.PI) / 180);
          const distKm = Math.sqrt(dLat * dLat + dLon * dLon).toFixed(1);

          return {
            id: String(item.place_id || idx),
            name: item.name || item.display_name.split(',')[0] || 'Dermatology Clinic',
            address: item.display_name,
            distance: `${distKm} km away`,
            lat: itemLat,
            lon: itemLon,
          };
        });
        setClinics(formatted);
      } else {
        // Fallback regional prompt
        setClinics([]);
      }
    } catch (err) {
      console.warn('OSM clinic search notice:', err);
      setClinics([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        searchNearbyClinics(coords.lat, coords.lon, 'Your Current Location');
      },
      (err) => {
        setIsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location access was declined. You can type your city below or search the official AAD directory.');
        } else {
          setGeoError('Could not obtain location. Please search by city name.');
        }
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setGeoError(null);

    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1`;
      const res = await fetch(geoUrl);
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        await searchNearbyClinics(lat, lon, searchQuery);
      } else {
        setUserLocationName(searchQuery);
        setHasSearched(true);
        setClinics([]);
        setIsLoading(false);
      }
    } catch (err) {
      setUserLocationName(searchQuery);
      setHasSearched(true);
      setClinics([]);
      setIsLoading(false);
    }
  };

  const googleMapsSearchUrl = userLocationName
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`dermatologist near ${userLocationName}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('dermatologist near me')}`;

  return (
    <div className="p-4 sm:p-5 bg-white/95 dark:bg-[#111827]/95 rounded-2xl border border-rose-200/90 dark:border-rose-900/50 space-y-4 text-xs shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-950">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{t('locator.title')}</span>
        </div>
        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
          {t('locator.badge')}
        </span>
      </div>

      <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
        {t('locator.description')}
      </p>

      {/* 🌟 1. Primary Gold-Standard Recommendation: Official AAD Directory Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/60 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                {t('locator.aadTitle')}
              </h5>
              <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">
                {t('locator.aadSubtitle')}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          {t('locator.aadDesc')}
        </p>

        <a
          href="https://find-a-derm.aad.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-between w-full py-2.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-sm active:scale-98 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            <span>{t('locator.aadBtn')}</span>
          </span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 📍 2. Interactive Local City Search & Google Maps Live Locator */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Stethoscope className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>{t('locator.searchTitle')}</span>
        </div>

        <form onSubmit={handleManualSearch} className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('locator.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-400 dark:focus:border-rose-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold transition-all disabled:opacity-40 text-xs cursor-pointer"
          >
            {t('locator.searchBtn')}
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLoading}
            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600 dark:text-rose-400" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            )}
            <span>{isLoading ? t('locator.locatingBtn') : t('locator.useLocationBtn')}</span>
          </button>

          <a
            href={googleMapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-800/80 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>{t('locator.openGoogleMaps')}</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>

      {/* Geolocation Notice / Error */}
      {geoError && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Nearby Clinic Results List */}
      {clinics.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Direct OpenStreetMap Matches ({clinics.length}):
          </span>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                    <Building2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span className="truncate">{clinic.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {clinic.address}
                  </p>
                  {clinic.distance && (
                    <span className="inline-block text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                      📍 {clinic.distance}
                    </span>
                  )}
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${clinic.name} ${clinic.address}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex-shrink-0 mt-0.5"
                  title="Get Directions"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSearched && clinics.length === 0 && !isLoading && (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
          <span>Search completed for <strong>{userLocationName}</strong>.</span>
          <a
            href={googleMapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>View on Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
