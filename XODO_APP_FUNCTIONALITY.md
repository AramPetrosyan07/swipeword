# Xodo Desktop Application — Complete Functionality Reference

> **Platform:** Windows, macOS, Linux (fully offline)
> **Products:** Xodo PDF Reader (Free) | Xodo PDF Studio (Paid)
> **Latest Version:** 2026.1.2 (Released June 8, 2026)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [PDF Reading Features](#2-pdf-reading-features)
3. [PDF Editing Features](#3-pdf-editing-features)
4. [Annotation & Markup Tools](#4-annotation--markup-tools)
5. [OCR (Optical Character Recognition)](#5-ocr-optical-character-recognition)
6. [Form Management](#6-form-management)
7. [Page Management](#7-page-management)
8. [Document Conversion](#8-document-conversion)
9. [Security & Protection](#9-security--protection)
10. [Digital Signatures](#10-digital-signatures)
11. [Batch Processing & Automation](#11-batch-processing--automation)
12. [User Interface](#12-user-interface)
13. [Integrations & Storage](#13-integrations--storage)
14. [Pricing Plans](#14-pricing-plans)

---

## 1. Product Overview

Xodo is a cross-platform document management ecosystem consisting of multiple products:

| Product | Type | Price | Platforms |
|---------|------|-------|-----------|
| **Xodo PDF Reader** | Free desktop app | Free | Windows, macOS, Linux |
| **Xodo PDF Studio** | Advanced desktop editor | $9.99–$19.99/mo | Windows, macOS, Linux |
| **Xodo Web** | Browser-based tools | $9.99/mo | Any browser |
| **Xodo Mobile** | Mobile app | Free + In-App Purchases | Android, iOS |
| **Xodo Sign** | E-signature platform | Separate pricing | Web |

**Key differentiator:** All desktop products work **100% offline** — no internet connection required for any PDF reading or editing operations.

---

## 2. PDF Reading Features

### 2.1 Layout Options

Xodo provides multiple document layout configurations to suit different reading preferences:

| Layout | Description |
|--------|-------------|
| **Single Page** | One page at a time, full width |
| **Facing (Two-Page)** | Two pages side by side, like an open book |
| **Cover Page** | First page alone on the left, then facing pages |
| **Four-Page** | Four pages displayed simultaneously |
| **Continuous Scroll** | Pages flow vertically in a single column |
| **Page Flip** | Animated page-turning effect |

### 2.2 View Modes

- **Reading Mode:** Distraction-free view that hides toolbars and menus for immersive reading. Maximizes screen real estate for document content.
- **Full Screen:** Expands the document to fill the entire monitor, hiding all OS chrome.
- **Invert Colors:** Swaps the document's color scheme (white background → black, black text → white). Useful for reducing eye strain in low-light environments or for accessibility purposes.

### 2.3 Navigation

- **Page navigation panel:** Jump to any page by number or thumbnail
- **Bookmarks panel:** View and navigate to embedded PDF bookmarks/outlines
- **Go to Page:** Direct page number input for instant navigation
- **Previous/Next page:** Arrow key and button navigation
- **Scroll modes:** Vertical scroll, horizontal scroll, or page-by-page

### 2.4 Zoom & Magnification

- **Zoom In/Out:** Pinch, scroll wheel, or toolbar buttons
- **Page Fit options:**
  - Fit to Width
  - Fit to Height
  - Fit to Page
  - Actual Size (100%)
- **Marquee Zoom:** Draw a rectangle to zoom into a specific area

### 2.5 Page Rotation

- **Clockwise rotation:** 90° per click
- **Counter-clockwise rotation:** 90° per click
- Rotation is per-page and non-destructive (can be undone)

### 2.6 Text Selection & Search

- **Text Selection:** Click and drag to select text for copying
- **Text Search:** Integrated search bar for finding words/phrases within the document
  - Previous/Next match navigation
  - Match count display
  - Search across multiple folders (2026.0.0+)
- **Copy selected text:** Ctrl+C / Cmd+C

### 2.7 Read Out Loud

- **Text-to-Speech:** Reads the document content aloud
- Supports pausing, stopping, and volume control
- Can run without the Read Out Loud library installed (2026.0.0+ option)

### 2.8 Multi-Tab Document Management

- Open multiple PDF documents in separate tabs
- Switch between documents quickly
- Close individual tabs
- Save changes per tab

### 2.9 Split View

- **Two-page split:** View two different pages of the same document simultaneously
- **Four-page split:** View four different pages simultaneously
- Useful for comparing sections or referencing different parts of a long document

### 2.10 Document Locking (New in 2026.1.2)

- Lock open files to prevent other programs from modifying them
- Useful in collaborative environments to avoid conflicts

---

## 3. PDF Editing Features

### 3.1 Text Editing

#### Edit Existing Text
1. Navigate to **Document → Edit PDF Content**
2. Double-click on any text box in the PDF
3. Edit the text directly — add, remove, or modify characters
4. Click outside the text box to apply changes

**Font Auto-Detection:** Xodo automatically identifies the font type, size, and style of existing text. When you add new text within an existing text box, it defaults to the detected font properties.

#### Add New Text
1. Click the **Add Text** button in the toolbar
2. Click anywhere on the page to place a new text box
3. Type your content
4. Configure properties:
   - **Font type** and **font size**
   - **Text color** (full color picker)
   - **Alignment** (left, center, right, justified)
   - **Bold**, *italic*, <u>underline</u>
   - **Transparency/opacity**
   - **Position** (x, y coordinates)
   - **Rotation angle**

**Note:** New text boxes default to bold formatting.

#### Text Box Manipulation
- **Drag-and-drop:** Click and drag text boxes to reposition
- **Resize:** Drag corner/edge handles to resize
- **Delete:** Select and press Delete key

### 3.2 Image Editing

#### Insert Images
1. Click **Add Image** in the Document toolbar
2. Select an image file from your computer
3. Supported formats: JPG, PNG, BMP, TIFF, HEIC, HEIF (HEIC/HEIF added in 2025.3.0)

#### Image Manipulation
- **Drag-and-drop** to reposition anywhere on the page
- **Resize** by dragging corner handles (maintains aspect ratio)
- **Delete** by selecting and pressing Delete

### 3.3 Redaction

Redaction permanently removes sensitive information from a PDF. Unlike simply covering content with a black box, Xodo's redaction **completely removes** the underlying data.

#### How to Redact
1. Select the **Redaction Tool** from the Document toolbar
2. Mark areas to redact:
   - **Text redaction:** Highlight text to redact
   - **Image redaction:** Click on images to redact
   - **Page redaction:** Mark entire pages
3. Marked areas appear with a colored highlight (default: red border)
4. Click **Apply All Redactions** to permanently remove the content
5. Save the document

**Important:** Redaction is irreversible once applied. The underlying content is completely removed from the PDF structure, not just visually hidden.

#### Redaction Use Cases
- Remove personal information (names, addresses, SSNs)
- Hide financial data (account numbers, amounts)
- Obscure classified/sensitive text in legal documents
- Remove metadata and hidden content

### 3.4 Page Content Manipulation

- **Move text blocks:** Drag entire text elements to new positions
- **Move images:** Reposition images anywhere on the page
- **Delete content:** Remove text blocks or images entirely
- **Reflow text:** When editing inline text, content reflows to accommodate changes
- **Advanced styling:** Change colors, fonts, sizes, and formatting of existing content

---

## 4. Annotation & Markup Tools

### 4.1 Sticky Notes

- Place floating note icons anywhere on the page
- Click to expand and read/write the note content
- Different color options available
- Notes can be resized and repositioned

### 4.2 Text Boxes

- Free-floating text annotations on the page
- Customizable font, size, color
- Semi-transparent background option
- Border color and thickness options

### 4.3 Callouts

- Text annotations with an arrow/leader line pointing to specific content
- Useful for drawing attention to specific areas
- Customizable arrow style and text properties

### 4.4 Typewriter

- Click anywhere on the page and start typing directly
- Text appears as an overlay on the PDF
- Useful for filling in blank spaces on forms that don't have form fields

### 4.5 Highlight, Underline, Strikethrough

- **Highlight:** Semi-transparent color overlay on selected text
- **Underline:** Line beneath selected text
- **Strikethrough:** Line through selected text
- All three support customizable colors

### 4.6 Drawing & Shapes

#### Freehand Drawing
- Draw anywhere on the page with mouse/stylus
- Customizable pen color, thickness, and opacity
- Supports digital pen/stylus input (Samsung S-Pen, Wacom, etc.)

#### Shape Tools
- **Rectangle** (filled or outline)
- **Ellipse/Circle** (filled or outline)
- **Line** (straight lines with adjustable endpoints)
- **Arrow** (lines with arrowheads)
- **Polyline** and **Polygon**
- Customizable color, thickness, fill, and opacity

### 4.7 Stamps

- Pre-built stamps: Approved, Draft, Confidential, Final, etc.
- Custom stamps from images
- Date/time stamps
- Adjustable size and rotation

### 4.8 Sound Annotations

- Record audio messages directly onto the PDF
- Click the sound icon to play back
- Useful for quick voice comments during document review
- Attach audio to any specific location on the page

### 4.9 File Attachments

- Attach external files to any point in the PDF
- Embedded as annotations within the PDF structure
- Supported attachment types: any file format

### 4.10 Measurement Tools

- **Distance measurement:** Click two points to measure distance
- **Area measurement:** Draw a shape to measure its area
- **Perimeter measurement:** Calculate the perimeter of drawn shapes
- **Tape measuring tool** (2025.3.0+): Measure distances without leaving permanent annotation marks
- Calibrate scale to match real-world units (inches, cm, etc.)

### 4.11 Annotations Management

- **Annotation list panel:** View all annotations in a document
- **Sort by:** Page, date, type, author
- **Filter by type:** Show only specific annotation types
- **Delete annotations:** Remove individual or all annotations
- **Export annotations:** Save annotations separately
- **Delayed loading** (optimized): Annotations load progressively for faster document opening

---

## 5. OCR (Optical Character Recognition)

### What is OCR?
OCR converts scanned images of text into searchable, editable PDF documents. After OCR processing, you can:
- **Search** for text within scanned pages
- **Copy** text from previously image-only pages
- **Edit** text that was previously locked in images
- **Highlight** and **annotate** recognized text

### How to Use OCR
1. Open a scanned PDF or image-based document
2. Navigate to **Document → OCR**
3. Select the language(s) for recognition
4. Choose OCR mode:
   - **Full Document:** Process all pages
   - **Current Page:** Process only the visible page
   - **Page Range:** Specify which pages to process
5. Click **Start OCR**
6. Processing time depends on document size and complexity

### OCR Capabilities
- Multi-language support
- Preserves original layout and formatting
- Creates a searchable text layer behind the image
- Original image content remains intact

---

## 6. Form Management

### 6.1 Fill Interactive PDF Forms

Xodo can detect and fill standard PDF form fields:

| Field Type | Description |
|------------|-------------|
| **Text Fields** | Single-line or multi-line text input |
| **Checkboxes** | Toggle on/off options |
| **Radio Buttons** | Select one option from a group |
| **Dropdown/Combobox** | Select from predefined list |
| **List Boxes** | Scrollable list of options |
| **Buttons** | Clickable action buttons |
| **Image Fields** | Insert images into form fields |

### 6.2 Form Filling Features

- **Auto Font Size:** Automatically adjusts text size to fit field boundaries
- **Tab navigation:** Move between fields using Tab key
- **Form field validation:** Checks for required fields and valid inputs
- **Save filled forms:** Preserve your entries when saving the PDF
- **Print filled forms:** Print the completed form

### 6.3 Create Forms

1. Navigate to **Document → Forms**
2. Select the form field type to add
3. Click on the page to place the field
4. Configure field properties:
   - **Field name** (for data extraction)
   - **Default value**
   - **Font** and **formatting**
   - **Validation rules**
   - **Tooltip text**
   - **Read-only** or **required** flags
5. Repeat for each field needed

### 6.4 Auto Form Fill

- Automatically populate form fields with saved data
- Useful for repetitive form filling
- Supports batch form filling across multiple documents

---

## 7. Page Management

### 7.1 Page Organization

| Operation | Description |
|-----------|-------------|
| **Insert Pages** | Add blank or imported pages at any position |
| **Delete Pages** | Remove specific pages or page ranges |
| **Extract Pages** | Save selected pages as a new PDF |
| **Move Pages** | Drag pages to reorder within the document |
| **Copy Pages** | Duplicate pages within or between documents |
| **Replace Pages** | Swap pages with content from another PDF |

### 7.2 Page Operations

- **Rotate Pages:** 90°, 180°, 270° rotation (per page or all pages)
- **Crop Pages:** Adjust page boundaries/margins
- **Resize Pages:** Change page dimensions (A4, Letter, Legal, Custom)
- **Split Pages:** Divide a page into multiple sections
- **Merge Pages:** Combine multiple pages into one

### 7.3 Merge & Split Documents

- **Merge PDFs:** Combine multiple PDF files into one document
- **Split PDF:** Separate a single PDF into multiple files
  - Split by page range
  - Split by every N pages
  - Split by bookmarks
  - Split by file size

---

## 8. Document Conversion

### 8.1 Convert From PDF

| Output Format | Description |
|---------------|-------------|
| **Word (.docx)** | Editable Microsoft Word document |
| **Excel (.xlsx)** | Spreadsheet with table detection |
| **PowerPoint (.pptx)** | Presentation slides |
| **HTML** | Web page format (fixed layout or reflowable) |
| **Text (.txt)** | Plain text extraction |
| **Images (JPG, PNG, BMP, TIFF)** | Image files per page |
| **PDF/A** | Archival PDF format |

### 8.2 Convert To PDF

| Source Format | Description |
|---------------|-------------|
| **Word (.docx)** | Microsoft Word documents |
| **Excel (.xlsx)** | Spreadsheets |
| **PowerPoint (.pptx)** | Presentations |
| **Images (JPG, PNG, BMP, TIFF, HEIC, HEIF)** | Image files |
| **Text (.txt)** | Plain text files |
| **DWG** | AutoCAD drawings |

### 8.3 Conversion Options

- **PDF to Excel:** Options for non-table content handling, multi-sheet vs single-sheet output
- **PDF to HTML:** Name pattern field for folder organization in fixed-layout conversion
- **Password-protected documents:** Improved handling when converting secured PDFs to Word/Excel/HTML
- **Batch conversion:** Convert multiple files simultaneously

### 8.4 PDF/A Conversion

- Convert standard PDFs to PDF/A (ISO 19005) compliant format
- PDF/A is the standard for long-term document archiving
- Validates existing PDF/A documents against ISO standards

---

## 9. Security & Protection

### 9.1 Password Protection

| Password Type | Purpose |
|---------------|---------|
| **User Password** | Required to open the document |
| **Owner Password** | Required to modify permissions |

### 9.2 Permissions Control

Restrict what users can do with the document:
- **Printing:** Allow/Deny or restrict to low resolution
- **Content Copying:** Allow/Deny text and image copying
- **Content Modification:** Allow/Deny editing
- **Commenting:** Allow/Deny annotations
- **Form Filling:** Allow/Deny form completion
- **Accessibility:** Allow/Deny screen reader access

### 9.3 Encryption

- **AES-128 bit** encryption
- **AES-256 bit** encryption
- **RC4** encryption (legacy compatibility)
- **PDF MAC tokens** (ISO 32004) — validation and encryption (added in 2025.2.0)

### 9.4 Redaction (Detailed)

See [Section 3.3](#33-redaction) for redaction details.

Additional security aspects:
- Redacted content is removed from the PDF object structure
- Metadata is cleaned during redaction
- Hidden text layers are purged

### 9.5 PDF Sanitization

PDF sanitization removes hidden/sensitive information that users may not be aware of:

| Hidden Data Type | What It Contains |
|------------------|------------------|
| **Metadata** | Author name, creation date, software used, keywords |
| **Hidden text** | Text invisible to the viewer |
| **Hidden images** | Images not displayed on the page |
| **File attachments** | Embedded files |
| **JavaScript** | Embedded scripts |
| **Embedded files** | OLE objects and other embedded content |
| **Forms data** | Previously entered form data |
| **Comments/annotations** | Hidden review comments |
| **Bookmarks** | Navigation bookmarks |
| **Page thumbnails** | Preview thumbnails |

**Sanitization process:**
1. Analyze the document for hidden content
2. Review what will be removed
3. Apply sanitization to permanently strip hidden data
4. Save the sanitized document

### 9.6 Document Certification

- **Certify document:** Sign the document to certify it hasn't been modified
- **Timestamp:** Add trusted timestamps to verify document state at a point in time

---

## 10. Digital Signatures

### 10.1 Creating a Digital Signature

1. Navigate to **Document → Digitally Sign**
2. Create your digital signature profile:
   - **Name**
   - **Organization** (optional)
   - **Location** (optional)
   - **Reason for signing** (optional)
   - **Include timestamp** (optional)
   - **Digital certificate** (from file or create new)

### 10.2 Signing Documents

1. Select **Digitally Sign** from the toolbar
2. Draw a rectangle where the signature should appear
3. Choose your signature profile
4. Apply the signature
5. The signature includes:
   - Visual representation (handwritten style)
   - Cryptographic verification data
   - Timestamp (if enabled)

### 10.3 Signature Verification

- Verify existing digital signatures in a document
- View signature details: signer name, date, reason, certificate info
- Check signature validity: Valid, Invalid, or Unknown

### 10.4 Xodo Sign Integration

- **Xodo Sign** is a separate e-signature platform (powered by Eversign)
- Integrated workflow: Edit PDF in PDF Studio → Send via Xodo Sign
- Supports multi-party signing workflows
- Automatic reminders and tracking
- Legally binding e-signatures

---

## 11. Batch Processing & Automation

### 11.1 Batch Processing

Process multiple files simultaneously for efficiency:

| Batch Operation | Description |
|-----------------|-------------|
| **Batch Convert** | Convert multiple PDFs to/from other formats |
| **Batch Merge** | Combine multiple PDFs into single documents |
| **Batch OCR** | Apply OCR to multiple scanned documents |
| **Batch Sign** | Apply digital signatures to multiple documents |
| **Batch Secure** | Apply password protection to multiple documents |
| **Batch Optimize** | Compress/optimize multiple PDFs |
| **Batch Flatten** | Flatten form fields across multiple documents |
| **Batch PDF/A** | Convert multiple documents to PDF/A format |
| **Batch Pages** | Apply page operations (delete, extract, rotate) to multiple files |

### 11.2 Action Wizard

Create custom automated workflows:

1. **Define a sequence of commands** (e.g., OCR → Compress → Password Protect → Save)
2. **Assign to a name** for easy reuse
3. **Apply to:**
   - A single document
   - Multiple selected documents
   - An entire folder of documents
4. **Save and share** Action Wizard configurations across machines (import/export)

### 11.3 How Batch Processing Works

1. Select multiple files in the batch processor
2. Choose the operation(s) to perform
3. Configure settings for each operation
4. Set output location and naming conventions
5. Click **Process** — Xodo handles all files sequentially or in parallel
6. Review the batch processing log for errors

---

## 12. User Interface

### 12.1 Modern Toolbar (2026.0.0+)

The March 2026 redesign introduced a streamlined toolbar:

```
┌─────────────────────────────────────────────────────────────┐
│ [Toggle] [Open] [Save] [Close] │ [Undo] [Redo] │ [Search] │
├─────────────────────────────────────────────────────────────┤
│ File Mgmt │ Annotation │ Drawing │ View │ Page Controls    │
│ • Open    │ • Callout   │ • Shape │ • Fit │ • Rotate       │
│ • Save    │ • Text Box  │ • Draw  │ • Layout│ • Pages      │
│ • Close   │ • Typewriter│ • Meas. │ • Full │ • Zoom        │
│           │ • Sticky Note│         │ • Read │              │
│           │ • Markup    │         │ • Invert│              │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 Classic Interface

- Traditional menu bar and toolbar layout
- Accessible via the Toggle switch on the modern toolbar
- Available for users who prefer the original design
- All features remain accessible

### 12.3 Interface Features

- **Tooltips:** Hover over any icon to see its name and function
- **Visual states:** Active/selected tools are visually highlighted in dropdowns
- **Customizable Ribbons** (PDF Studio 2025.3.0+):
  - Design your own toolbar layouts
  - Add/remove/rename ribbon tabs and groups
  - Import/export ribbon configurations
  - Start from Basic, Intermediate, or scratch profiles
  - Restore defaults button
- **Right-click context menu:**
  - Favorited tools
  - Print option
  - Page rotation options
- **Favorite tools:** Right-click any tool button to add/remove from favorites
- **In-app feedback button:** Direct feedback submission from the toolbar

### 12.4 Display Options

- **Page Color for Accessibility:** Custom background color for pages
- **Dark mode / Invert colors:** For comfortable reading in low light
- **DPi-aware scaling:** Handles multi-monitor setups with different DPI settings
- **Fullscreen:** Hide all chrome for maximum document space

---

## 13. Integrations & Storage

### 13.1 Cloud Storage Integration

| Service | Integration |
|---------|-------------|
| **Dropbox** | Open/Save directly to Dropbox |
| **Google Drive** | Open/Save directly to Google Drive |
| **OneDrive** | Open/Save directly to Microsoft OneDrive |
| **Xodo Drive** | 5GB included storage with paid plans |

### 13.2 File Format Support

#### Reading/Opening
- PDF (all versions)
- XFA forms
- PDF/A documents
- Encrypted/password-protected PDFs

#### Writing/Saving
- Standard PDF
- PDF/A (ISO 19005)
- PDF with embedded fonts
- Optimized/compressed PDF

---

## 14. Pricing Plans

### Free Tier

**Xodo PDF Reader** — Completely free, forever
- Open and view PDFs
- Annotate and markup
- Fill interactive forms
- Basic digital signatures
- Available on Windows, macOS, Linux

### Paid Plans

| Plan | Monthly Price | Annual Price | Key Features |
|------|---------------|--------------|--------------|
| **Xodo Essentials** | — | $4.99/mo | Unlimited web downloads, no daily limits |
| **Xodo PDF Studio** | $19.99/mo | $9.99/mo | 60+ tools, advanced editing, OCR, converters, offline |
| **Xodo Web** | $12.99/mo | $9.99/mo | Advanced web tools, OCR, compression, text editing |
| **Document Suite** | $24.99/mo | $14.99/mo | All products, all platforms, all features |
| **Perpetual License** | — | $240 one-time | Lifetime access to PDF Studio |

### Volume Discounts

| Users | Discount |
|-------|----------|
| 2–5 | 5% off |
| 6–20 | 10% off |
| 20+ | 15% off |

### Trial Options
- **Free demo:** Download and test PDF Studio (watermarks on saved docs)
- **7-day free trial:** Full access with credit card (cancel anytime)

---

## Quick Reference: Feature Availability

| Feature | PDF Reader (Free) | PDF Studio (Paid) |
|---------|:-:|:-:|
| View PDFs | ✅ | ✅ |
| Layout options | ✅ | ✅ |
| Reading mode | ✅ | ✅ |
| Invert colors | ✅ | ✅ |
| Text search | ✅ | ✅ |
| Read Out Loud | ✅ | ✅ |
| Multi-tab | ✅ | ✅ |
| Annotate (sticky notes, highlights) | ✅ | ✅ |
| Draw & shapes | ✅ | ✅ |
| Sound annotations | ✅ | ✅ |
| Fill forms | ✅ | ✅ |
| Digital signatures | ✅ | ✅ |
| Edit existing text | ❌ | ✅ |
| Add new text/images | ❌ | ✅ |
| Redaction | ✅ (basic) | ✅ (advanced) |
| OCR | ❌ | ✅ |
| Create forms | ❌ | ✅ |
| Merge/Split PDFs | ❌ | ✅ |
| Page management | ❌ | ✅ |
| Convert PDF | ❌ | ✅ |
| Batch processing | ❌ | ✅ |
| Action Wizard | ❌ | ✅ |
| Password protection | ❌ | ✅ |
| PDF sanitization | ❌ | ✅ |
| Custom ribbons | ❌ | ✅ |
| Document locking | ❌ | ✅ |

---

*Last updated: July 2026*
*Source: xodo.com, feedback.xodo.com, third-party reviews*
