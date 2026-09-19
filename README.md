# PixelCrypt — Image Encryption & Decryption System

> **Tagline:** *"Transforming Pixels. Securing Images."*  
> **Internship Assignment:** SkillCraft Technology Cybersecurity Task 02  
> **Core Requirement:** *"Develop a simple image encryption tool using pixel manipulation. Support operations like swapping pixel values or applying a basic mathematical operation to each pixel."*

---

## 1. Project Overview

**PixelCrypt** is an academic image encryption and decryption application demonstrating key-driven pixel manipulation. Built with React 19, TypeScript, Tailwind CSS, and the Web Crypto API, the entire cryptographic pipeline operates **100% client-side** in browser memory—ensuring complete privacy with zero server communication and zero external telemetry.

The application focuses on the core workflow required for the cybersecurity internship:
```
Upload Image → Extract Pixels → Manipulate Pixels → Encrypt → View/Download Encrypted Image → Decrypt → Restore Original Image
```

---

## 2. Core Functional Sections

PixelCrypt is structured into four focused, accessible sections:

### 1. Encrypt Workspace
- **Image Upload & Validation**: Drag-and-drop or select any PNG, JPEG, or WebP image. Built-in boundary validation enforces size ($\le 25\text{ MB}$) and dimension limits ($\le 8192 \times 8192$).
- **Quick Sample Patterns**: Pre-configured test rasters (Cyber Shield, Color Gradient, Checkerboard) for instant testing.
- **Key Input**: Custom secret passphrase with real-time entropy calculation and password strength feedback.
- **Cryptographic Modes**:
  - **Educational Pixel Mode (Primary)**: Visual pixel manipulation using key-derived Fisher-Yates permutation, modular arithmetic ($\pmod{256}$), keystream XOR, and HMAC-SHA256 integrity tag generation.
  - **Secure Mode (Secondary)**: Standardized authenticated AES-256-GCM encryption with PBKDF2 (100,000 iterations).
- **Encrypted Preview & Export**: Interactive split-slider comparison and one-click download of the canonical `.pixelcrypt` binary container or scrambled PNG.

### 2. Decrypt Workspace
- **Container & Image Loading**: Supports canonical `.pixelcrypt` binary containers or scrambled images.
- **Header Parsing**: Safely unpacks and displays container metadata (mode, dimensions, payload size, integrity tag).
- **Key Verification**: Decrypts using the matching secret passphrase.
- **Exact Restoration**: Reverses the pixel manipulation in exact inverse mathematical sequence to restore bit-identical original pixels.
- **Integrity Safeguards**: Wrong keys or corrupted payloads trigger an immediate safe rejection banner without rendering corrupted rasters.
- **Restored Export**: Download the restored image as a lossless PNG.

### 3. Pixel Matrix Visualizer
- **Micro-Matrix Dissection**: Samples $4 \times 4$ or $8 \times 8$ pixel grids from the image and walks through the 4-phase transformation step-by-step:
  - **Step 0 — Original**: Raw RGBA pixel values before manipulation.
  - **Step 1 — Pixel Permutation**: Spatial pixel swapping via deterministic Fisher-Yates shuffle derived from the key.
  - **Step 2 — Modular Arithmetic**: Mathematical shift in the finite ring $\mathbb{Z}_{256}$: $C' = (C + S_k) \pmod{256}$.
  - **Step 3 — Keystream XOR**: Reversible bitwise diffusion: $C'' = C' \oplus X_k$.

### 4. How It Works
- **Academic Cryptography Guide**: Explains the mathematical representation of digital images, finite-ring operations, deterministic keystream derivation, and the differences between Educational Pixel Mode and Secure Mode.

---

## 3. Mathematical Operations & Reversibility

The core educational encryption workflow applies three reversible operations:

1. **Spatial Pixel Permutation**:
   Pixels are rearranged according to a deterministic Fisher-Yates shuffle seeded by a key-derived ChaCha20 DRBG stream:
   $$P_{\text{perm}} = \text{FisherYates}(P_{\text{orig}}, K_{\text{stream}})$$

2. **Modular Arithmetic ($\mathbb{Z}_{256}$)**:
   A key-derived modular offset is added to each color channel (0–255):
   $$C' = (C + S_k) \pmod{256}$$

3. **Keystream XOR Masking**:
   Each byte is bitwise XORed with pseudorandom keystream bytes:
   $$C'' = C' \oplus X_k$$

### Exact Decryption Reversal:
1. **Invert Keystream XOR**: $C' = C'' \oplus X_k$
2. **Invert Modular Shift**: $C = (C' - S_k + 256) \pmod{256}$
3. **Invert Permutation**: $P_{\text{orig}}[\text{perm}[i]] = P_{\text{perm}}[i]$
4. **Integrity Check**: $\text{HMAC-SHA256}(P_{\text{orig}}) \stackrel{?}{=} \text{HeaderTag}$

---

## 4. The Canonical `.pixelcrypt` Binary Container

PixelCrypt packages encrypted data into an authenticated binary container:

```
+-------------------+--------------------+-----------------------+--------------------------+-----------------------+
| Magic (10 Bytes)  | Version (2 Bytes)  | Header Length (4B)    | JSON Metadata (Variable) | Encrypted Payload     |
| "PIXELCRYPT"      | 0x0001             | UInt32 Big-Endian     | UTF-8 Header JSON        | Raw Ciphertext Bytes  |
+-------------------+--------------------+-----------------------+--------------------------+-----------------------+
```

---

## 5. Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + TypeScript (Strict Mode) + Vite |
| **Styling** | Tailwind CSS v4 + Lucide React Icons |
| **Image Processing** | HTML5 Canvas API, `ImageData`, `Uint8ClampedArray` |
| **Cryptographic Primitives** | Web Crypto API (`SubtleCrypto`), PBKDF2, AES-256-GCM, HMAC-SHA256 |
| **Deterministic PRNG** | RFC 8439 ChaCha20 Counter-Mode DRBG with rejection sampling |
| **Test Framework** | Vitest (31 automated unit tests across 3 suites) |
| **Linter** | Oxlint (0 warnings, 0 errors) |

---

## 6. SkillCraft Technology Task 02 Compliance

| Assignment Requirement | Implementation in PixelCrypt | Status |
|---|---|:---:|
| **Image Upload** | Drag-and-drop file upload with format, size, and dimension validation | Verified |
| **Pixel Extraction** | HTML5 Canvas `getImageData` extracting raw RGBA `Uint8ClampedArray` | Verified |
| **Pixel Swapping / Permutation** | Deterministic Fisher-Yates shuffle derived from key via ChaCha20 DRBG | Verified |
| **Mathematical Operation** | Reversible modular arithmetic in $\mathbb{Z}_{256}$: $C' = (C + S_k) \pmod{256}$ | Verified |
| **Key-Based Transformation** | Keystream XOR masking derived from PBKDF2-SHA256 | Verified |
| **Decryption & Restoration** | Exact inverse transformation restoring 100% bit-equal original pixels | Verified |
| **Encrypted Image Output** | Downloadable canonical `.pixelcrypt` container and scrambled PNG export | Verified |
| **Interactive Demonstration** | Focused 4-tab web suite with Pixel Matrix visualizer and educational guide | Verified |

---

## 7. Installation & Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### Installation
```bash
# Clone or navigate to the repository directory
cd c:/CodeAlpha/PixelCrypt

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
# Open http://localhost:5173/ in your browser
```

### Running Automated Tests
```bash
npm test
# Executes all 31 core unit and integration tests
```

### Production Build
```bash
npm run build
# Compiles TypeScript and builds production bundle via Vite
```

### Code Linting
```bash
npm run lint
# Verifies codebase with Oxlint (0 warnings, 0 errors)
```

---

## 8. Security Advisory

> **Disclaimer:** PixelCrypt's Educational Pixel Mode is designed to demonstrate image encryption concepts through pixel manipulation for the SkillCraft Technology Cybersecurity Internship. It provides educational visual demonstration and reversible manipulation. For standard confidentiality and integrity requirements, the application also includes standardized AES-256-GCM with PBKDF2 key stretching.
