import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

export interface ScanResultPayload {
  rawText: string;
  type: 'dock' | 'truck' | 'unknown';
  dockId?: string;
  query?: string;
}

/**
 * Verifica y solicita permisos de cámara en Android
 */
export async function requestCameraPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const status = await BarcodeScanner.checkPermissions();
    if (status.camera === 'granted') {
      return true;
    }
    const request = await BarcodeScanner.requestPermissions();
    return request.camera === 'granted';
  } catch (err) {
    console.error('Error al solicitar permisos de cámara:', err);
    return false;
  }
}

/**
 * Escanea un código QR utilizando el lector nativo de Google ML Kit en Android.
 * Si no está en un dispositivo móvil nativo, retorna null para abrir el modal web.
 */
export async function scanNativeQrCode(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      alert('Se requieren permisos de cámara para escanear códigos QR en los andenes.');
      return null;
    }

    // Verificar si el módulo de Google Barcode Scanner está instalado
    if (Capacitor.getPlatform() === 'android') {
      const moduleAvailable = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!moduleAvailable.available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
      }
    }

    // Ejecuta el escáner nativo a pantalla completa con linterna, auto-foco y zoom de Google
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128, BarcodeFormat.Code39],
    });

    if (barcodes && barcodes.length > 0) {
      const scanned = barcodes[0].rawValue || barcodes[0].displayValue || '';
      return scanned.trim();
    }

    return null;
  } catch (error: any) {
    // Si el usuario canceló el escaneo, no es un error
    if (error?.message?.includes('canceled') || error?.message?.includes('cancelled')) {
      return null;
    }
    console.error('Error durante el escaneo nativo:', error);
    throw error;
  }
}

/**
 * Analiza el texto escaneado para determinar si es un Andén, una Patente de Camión o un RUT
 */
export function parseScannedQr(
  rawText: string,
  existingDocks: Array<{ id: string; name: string }>
): ScanResultPayload {
  const text = rawText.trim();

  // 1. Caso: URL de liberación de andén (?qr_release_dock=xxx)
  try {
    if (text.includes('qr_release_dock=')) {
      const url = new URL(text.startsWith('http') ? text : `https://dummy.cl/${text}`);
      const dockParam = url.searchParams.get('qr_release_dock');
      if (dockParam) {
        return {
          rawText: text,
          type: 'dock',
          dockId: dockParam,
        };
      }
    }
  } catch {
    // No es una URL válida, continuar con análisis de texto plano
  }

  // 2. Caso: Es directamente un ID o Nombre de Andén existente
  const dockMatch = existingDocks.find(
    (d) =>
      d.id.toLowerCase() === text.toLowerCase() ||
      d.name.toLowerCase() === text.toLowerCase() ||
      d.name.toLowerCase() === `andén ${text}`.toLowerCase() ||
      d.name.toLowerCase() === `anden ${text}`.toLowerCase()
  );

  if (dockMatch) {
    return {
      rawText: text,
      type: 'dock',
      dockId: dockMatch.id,
    };
  }

  // 3. Caso: Prefijo DOCK-xxx o ANDEN-xxx
  const dockPrefixMatch = text.match(/^(?:dock|anden|andén)[-_:\s]*(.+)$/i);
  if (dockPrefixMatch) {
    const candidate = dockPrefixMatch[1].trim();
    const match = existingDocks.find(
      (d) =>
        d.id.toLowerCase() === candidate.toLowerCase() ||
        d.name.toLowerCase().includes(candidate.toLowerCase())
    );
    if (match) {
      return {
        rawText: text,
        type: 'dock',
        dockId: match.id,
      };
    }
  }

  // 4. Caso: Es una patente o RUT o chofer
  return {
    rawText: text,
    type: 'truck',
    query: text,
  };
}
