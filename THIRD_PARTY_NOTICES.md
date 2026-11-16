# Third-party components

HestFile uses @imgly/background-removal (IMG.LY), licensed under GNU AGPL v3. The application is distributed under AGPL-3.0-only; see LICENSE. An alternate commercial license is available from IMG.LY. The build creates a corresponding source archive, accessible from the footer. Preserve this source availability when distributing or hosting an AGPL version, including modifications.

Other key dependencies: React (MIT), Vite (MIT), lucide-react (ISC), pdf-lib (MIT), pdfjs-dist (Apache-2.0), docx (MIT), fflate (MIT), Tesseract.js (Apache-2.0), busboy (MIT), and onnxruntime-web (MIT). Consult their installed LICENSE files for exact notices. AI models, trained OCR data, and fonts are fetched from third-party hosts under their respective terms. Review those terms if distributing models yourself. No 11zon source, branding, or assets are included.

Local modification to IMG.LY 1.7.0: scripts/patch-imgly.mjs changes floating-point alpha conversion from wrapping Uint8Array to saturating Uint8ClampedArray, applied to the ESM and CJS distributions. Both the patch source and dependency version are included in the corresponding source archive.
