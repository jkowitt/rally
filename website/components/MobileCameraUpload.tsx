"use client";

import { useState, useRef } from 'react';

interface BuildingAnalysis {
  propertyType?: string;
  estimatedYearBuilt?: number;
  stories?: number;
  condition?: string;
  conditionScore?: number;
  architecturalStyle?: string;
  features?: string[];
  estimatedSquareFeet?: number;
  visibleUnits?: number;
  wearTearNotes?: string;
  recommendations?: string;
  rawDescription?: string;
}

interface MobileCameraUploadProps {
  onAddressDetected?: (address: string, coordinates: { lat: number; lng: number }) => void;
  onImageUploaded?: (imageUrl: string) => void;
  onBuildingAnalyzed?: (analysis: BuildingAnalysis) => void;
}

interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

export default function MobileCameraUpload({ onAddressDetected, onImageUploaded, onBuildingAnalyzed }: MobileCameraUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BuildingAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Extract GPS coordinates from EXIF data
   * Uses the browser's built-in EXIF reading capabilities
   */
  const extractGPSFromImage = async (file: File): Promise<GPSCoordinates | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;

          // Try to use exifr library if available (we'll install this)
          // For now, we'll use a mock implementation that extracts from a canvas
          const img = new Image();
          img.onload = async () => {
            try {
              // Check if the browser supports EXIF extraction
              // In production, you would use the exifr library here
              // For now, we'll attempt to extract using a dynamic import

              const exifr = await import('exifr').catch(() => null);

              if (exifr) {
                const gps = await exifr.gps(file);
                if (gps && gps.latitude && gps.longitude) {
                  resolve({
                    latitude: gps.latitude,
                    longitude: gps.longitude,
                  });
                  return;
                }
              }

              resolve(null);
            } catch (err) {
              console.error('Error extracting EXIF:', err);
              resolve(null);
            }
          };

          img.onerror = () => resolve(null);
          img.src = URL.createObjectURL(file);
        } catch (err) {
          console.error('Error reading file:', err);
          resolve(null);
        }
      };

      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Reverse geocode coordinates to get address
   */
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await response.json();

      if (data.success && data.address) {
        return data.address;
      }

      return null;
    } catch (err) {
      console.error('Error reverse geocoding:', err);
      return null;
    }
  };

  /**
   * Analyze building image with AI
   */
  const analyzeBuildingImage = async (file: File): Promise<BuildingAnalysis | null> => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/analyze-building', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.analysis) {
        return data.analysis;
      }

      return null;
    } catch (err) {
      console.error('Error analyzing building:', err);
      return null;
    }
  };

  /**
   * Handle file upload
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setAnalysis(null);

    try {
      // Create preview URL
      const imageUrl = URL.createObjectURL(file);

      // Always analyze the building with AI (regardless of GPS data)
      const buildingAnalysis = await analyzeBuildingImage(file);

      if (buildingAnalysis) {
        setAnalysis(buildingAnalysis);
        if (onBuildingAnalyzed) {
          onBuildingAnalyzed(buildingAnalysis);
        }
      }

      // Also try to extract GPS coordinates from EXIF (optional)
      const gps = await extractGPSFromImage(file);

      if (gps) {
        // Reverse geocode to get address
        const address = await reverseGeocode(gps.latitude, gps.longitude);

        if (address && onAddressDetected) {
          onAddressDetected(address, { lat: gps.latitude, lng: gps.longitude });
          setSuccess(`✅ Address detected from GPS: ${address}`);
        }
      }

      // If we have AI analysis but no GPS
      if (buildingAnalysis && !gps) {
        setSuccess('✅ Building analyzed successfully! Please enter the address manually.');
      }

      // If we have both
      if (buildingAnalysis && gps) {
        setSuccess('✅ Building analyzed and GPS location detected!');
      }

      if (onImageUploaded) {
        onImageUploaded(imageUrl);
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      border: '2px dashed #cbd5e0',
      borderRadius: '8px',
      padding: '1.5rem',
      textAlign: 'center',
      background: '#f7fafc',
      marginTop: '0.5rem',
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <div style={{ marginBottom: '1rem' }}>
        <svg
          style={{ width: '48px', height: '48px', margin: '0 auto', color: '#4299e1' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>

      <h4 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem' }}>
        🤖 AI Building Analysis
      </h4>

      <p style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '1rem' }}>
        Upload any photo of a building and AI will analyze its type, condition, features, and more. GPS location extraction is optional.
      </p>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          padding: '0.75rem 1.5rem',
          background: uploading ? '#cbd5e0' : '#4299e1',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
          transition: 'background 0.2s',
        }}
      >
        {uploading ? '🔄 Processing...' : '📷 Take Photo / Upload'}
      </button>

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#fed7d7',
          color: '#c53030',
          borderRadius: '6px',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#c6f6d5',
          color: '#276749',
          borderRadius: '6px',
          fontSize: '0.875rem',
        }}>
          {success}
        </div>
      )}

      {analysis && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#ebf8ff',
          border: '1px solid #90cdf4',
          borderRadius: '6px',
          textAlign: 'left',
        }}>
          <h5 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>
            🏠 AI Analysis Results
          </h5>

          <div style={{ fontSize: '0.8rem', lineHeight: '1.6' }}>
            {analysis.propertyType && (
              <div><strong>Property Type:</strong> {analysis.propertyType}</div>
            )}
            {analysis.condition && (
              <div><strong>Condition:</strong> {analysis.condition} {analysis.conditionScore && `(${analysis.conditionScore}/10)`}</div>
            )}
            {analysis.stories && (
              <div><strong>Stories:</strong> {analysis.stories}</div>
            )}
            {analysis.estimatedYearBuilt && (
              <div><strong>Est. Year Built:</strong> {analysis.estimatedYearBuilt}</div>
            )}
            {analysis.estimatedSquareFeet && (
              <div><strong>Est. Square Feet:</strong> {analysis.estimatedSquareFeet.toLocaleString()}</div>
            )}
            {analysis.architecturalStyle && (
              <div><strong>Style:</strong> {analysis.architecturalStyle}</div>
            )}
            {analysis.features && analysis.features.length > 0 && (
              <div><strong>Features:</strong> {analysis.features.join(', ')}</div>
            )}
            {analysis.wearTearNotes && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Wear & Tear:</strong> {analysis.wearTearNotes}
              </div>
            )}
            {analysis.recommendations && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Recommendations:</strong> {analysis.recommendations}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{
        marginTop: '1rem',
        fontSize: '0.75rem',
        color: '#a0aec0',
      }}>
        💡 Tip: Upload any building photo for AI analysis. Location services help but aren't required.
      </div>
    </div>
  );
}
