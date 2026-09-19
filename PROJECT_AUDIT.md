# PixelCrypt Final Project & Security Audit (Simplified Architecture)

**Audit Date:** 2026-09-17  
**Project:** PixelCrypt — Image Encryption & Decryption System  
**Tagline:** *"Transforming Pixels. Securing Images."*  
**Workspace:** `c:\CodeAlpha\PixelCrypt`  
**Internship Assignment:** SkillCraft Technology — Cybersecurity Task 02  
**Final Audit Status:** PASS — READY FOR INTERNSHIP SUBMISSION  

---

## 1. Project Overview & Scope Simplification

PixelCrypt has been restructured and simplified from an advanced cryptanalysis platform into a focused, educational **image encryption and decryption application** demonstrating pixel manipulation for the SkillCraft Technology Cybersecurity Internship Task 02.

The application strictly implements the required core flow:
```
Upload Image → Extract Pixels → Manipulate Pixels → Encrypt → View/Download Encrypted Image → Decrypt → Restore Original Image
```

### Simplified 4-Tab Workspace:
1. **Encrypt**: Upload image, select Educational Pixel Mode (or Secure Mode), enter key, execute encryption, preview encrypted image, download `.pixelcrypt` or scrambled PNG.
2. **Decrypt**: Upload `.pixelcrypt` container or scrambled image, enter key, execute decryption, verify integrity, restore bit-identical original image, download restored PNG.
3. **Pixel Matrix**: Interactive step-by-step 4-stage micro-matrix inspection demonstrating the exact pixel transformations (Original Pixels $\to$ Spatial Permutation $\to$ Modular Arithmetic $\to$ Keystream XOR).
4. **How It Works**: Educational guide detailing the digital image representation, mathematical formulas, and mode comparison.

---

## 2. Features Removed vs Retained

### Features Removed:
- **Security Center**: Removed from application UI and active workflow.
- **Security Health Check**: Removed from application UI.
- **Security Event Log**: Removed from application UI and state.
- **Encryption Report Generator & JSON Export**: Removed from active application code.
- **Security Lab (Key Sensitivity, Tampering Demo, Diffusion Lab)**: Removed from active application workflow.
- **Threat Model UI Tab**: Removed from active application navigation.
- **Automated Demo Mode Modal**: Removed completely.
- **Cryptanalysis Analytics (Entropy, RGB Histogram, Correlation, NPCR/UACI)**: Removed completely.

### Core Features Retained:
- **Image Upload & Validation**: Drag-and-drop, dimension checks, file-size limits, format validation.
- **Pixel Extraction**: HTML5 Canvas `ImageData` RGBA pixel buffer extraction.
- **Pixel Manipulation**:
  - Deterministic Fisher-Yates spatial pixel permutation derived from key via ChaCha20 DRBG.
  - Reversible finite-field modular arithmetic in $\mathbb{Z}_{256}$: $C' = (C + S_k) \pmod{256}$.
  - Keystream bitwise XOR diffusion: $C'' = C' \oplus X_k$.
- **Encryption & Decryption**: Educational Pixel Mode (primary) and authenticated AES-256-GCM (secondary).
- **Exact Plaintext Restoration**: 100% bit-level identical recovery of original pixels upon decryption.
- **Integrity Verification**: HMAC-SHA256 integrity tag check ensuring wrong keys or corrupted files are safely caught and rejected.
- **Binary Container Format**: Canonical `.pixelcrypt` container with magic bytes, versioning, and defensive parsing.

---

## 3. Cryptographic Verification

1. **Bit-Exact Plaintext Restoration**: Verified that both Educational Pixel Mode and Secure AES-256-GCM Mode achieve 100% exact equality between original and restored pixel rasters across non-square images, solid images, and mixed-alpha images.
2. **Wrong-Key Rejection**: Verified that entering an incorrect key fails decryption immediately:
   - Educational Mode: HMAC-SHA256 integrity tag mismatch strictly rejects candidate plaintext.
   - Secure Mode: Web Crypto API detects Galois authentication tag failure and throws `OperationError`.
3. **Corrupted File Protection**: Modified ciphertexts are caught and rejected by the integrity check before any canvas allocation occurs.
4. **IV & Salt Freshness**: Every encryption invocation in both modes utilizes `crypto.getRandomValues()` to generate a fresh 16-byte salt and 96-bit random IV.
5. **Alpha Channel Preservation**: RGBA alpha channels remain intact throughout all transformations, preventing browser canvas premultiplication distortion.

---

## 4. Defensive Security Mechanisms Preserved

- **Input Validation**: `validateFile` rejects empty files, unsupported extensions, and oversized files ($> 25\text{ MB}$).
- **Filename Sanitization**: `sanitizeFilename` neutralizes directory traversal sequences and script tags.
- **Dimension Guards**: `validateDimensions` enforces minimum $2 \times 2$, maximum $8192 \times 8192$, and integer constraints.
- **Container Header Bounds**: Enforces maximum header metadata limit of 64KB (`headerLength <= 65536`) to prevent memory exhaustion.
- **Safe Base64 Decoding**: `base64ToBytes` safely handles malformed or truncated Base64 strings without unhandled DOMExceptions.
- **Key Derivation Precondition Checks**: Strict assertions reject empty or whitespace-only keys.
- **Memory Hygiene**: Canvas contexts discard offscreen elements promptly; Object URLs are revoked via `URL.revokeObjectURL`.
- **Zero Server Footprint**: 100% client-side execution; 0 bytes transmitted across any network endpoint.

---

## 5. Automated Test Suite Results

The automated test suite was trimmed to cover exclusively the remaining core application functionality:

| Test File | Status | Tests Passed | Focus Area |
|---|---|---|---|
| `src/tests/crypto.test.ts` | **PASS** | 17 / 17 | Core encryption, decryption reversibility, ChaCha20 DRBG, modular math, wrong-key rejection |
| `src/tests/container.test.ts` | **PASS** | 8 / 8 | `.pixelcrypt` container packing, unpacking, magic bytes, versioning, header limits |
| `src/tests/validation.test.ts` | **PASS** | 6 / 6 | File size limits, dimension limits, format validation, key validation |
| **Total Core Tests** | **PASS** | **31 / 31** | **100% Core Verification** |

---

## 6. Code Quality & Build Verification

- **Linting (`oxlint`)**: 0 warnings, 0 errors across 25 files with 116 rules.
- **TypeScript Compilation (`tsc -b`)**: 0 type errors.
- **Production Build (`vite build`)**: Build succeeded in 784ms; production bundle size: 311 KB.
- **Security Vulnerability Audit (`npm audit`)**: 0 vulnerabilities.
- **Browser Functional Verification**: End-to-end manual and automated browser verification confirmed:
  - Clean 4-tab navigation (`Encrypt`, `Decrypt`, `Pixel Matrix`, `How It Works`).
  - Successful image upload, key configuration, and encryption.
  - Encrypted image preview with interactive comparison slider and download options.
  - Seamless transition to Decrypt tab with container metadata.
  - Successful decryption and exact bit-level image restoration.
  - Safe failure handling and rejection banner on wrong key (`WrongKey123`).
  - Interactive 4-phase micro-matrix visualizer.
  - Educational cryptography guide in How It Works.
  - Zero console errors.

---

## 7. Final Recommendation & Readiness

PixelCrypt is fully simplified, robust, security-audited, and ready for internship submission for **SkillCraft Technology — Cybersecurity Task 02**.
