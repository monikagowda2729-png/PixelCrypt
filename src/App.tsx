import { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import type { ActiveTab } from './components/layout/Navbar';
import { Hero } from './components/layout/Hero';
import { Footer } from './components/layout/Footer';
import { EncryptWorkspace } from './components/encrypt/EncryptWorkspace';
import { DecryptWorkspace } from './components/decrypt/DecryptWorkspace';
import { PixelMatrixView } from './components/visualizer/PixelMatrixView';
import { HowItWorks } from './components/educational/HowItWorks';
import type { PixelCryptContainer } from './types/crypto';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('encrypt');

  // Shared session state between workspaces
  const [currentKey, setCurrentKey] = useState<string>('');
  const [container, setContainer] = useState<PixelCryptContainer | null>(null);
  const [packedBytes, setPackedBytes] = useState<Uint8Array | null>(null);
  const [originalDataUrl, setOriginalDataUrl] = useState<string | null>(null);
  const [originalPixels, setOriginalPixels] = useState<Uint8ClampedArray | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const handleEncryptionComplete = (data: {
    container: PixelCryptContainer;
    packedBytes: Uint8Array;
    originalImageDataUrl: string;
    encryptedImageDataUrl: string;
    originalPixels: Uint8ClampedArray;
    encryptedPixels?: Uint8ClampedArray;
    key: string;
  }) => {
    setContainer(data.container);
    setPackedBytes(data.packedBytes);
    setOriginalDataUrl(data.originalImageDataUrl);
    setOriginalPixels(data.originalPixels);
    setImageDimensions({
      width: data.container.header.width,
      height: data.container.header.height,
    });
    setCurrentKey(data.key);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Hero Section (displayed on primary landing / encrypt view) */}
      {activeTab === 'encrypt' && (
        <Hero onNavigate={setActiveTab} />
      )}

      {/* Main Workspace View */}
      <main className="flex-1">
        {activeTab === 'encrypt' && (
          <EncryptWorkspace
            onNavigate={setActiveTab}
            onEncryptionComplete={handleEncryptionComplete}
          />
        )}

        {activeTab === 'decrypt' && (
          <DecryptWorkspace
            initialKey={currentKey}
            initialContainer={container}
            initialPackedBytes={packedBytes}
            cachedOriginalDataUrl={originalDataUrl}
          />
        )}

        {activeTab === 'visualizer' && (
          <PixelMatrixView
            pixels={originalPixels}
            width={imageDimensions?.width || 16}
            height={imageDimensions?.height || 16}
            encryptionKey={currentKey || 'PixelCryptKey2026'}
          />
        )}

        {activeTab === 'how-it-works' && <HowItWorks />}
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

export default App;
