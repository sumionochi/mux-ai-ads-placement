# Mux AI Ads Placement

**AI-Powered Seamless Video Ad Integration**  
Transforming video advertising with GPT-4 Vision, Wan 2.5, and Mux Video Platform

### Demos
- [1-minute Demo Video](https://player.mux.com/uOrQlsBrrPFSOSBV00Wst3BJIiGiZ3HCP02l00itrP58dk)
- [Example Ads Result - jump to 0:55 and 1:25 for ad placements](https://player.mux.com/01PCE013NzMxw02IK4t2RuhvLWitMc01BOZsKp33VfCDKAY)

---

## Overview

Mux AI Ads Placement is an open-source platform that automatically inserts contextually relevant product ads into existing videos at natural scene transitions — making ads feel like part of the story rather than interruptions.

Key technologies:
- **Mux** – end-to-end video infrastructure (upload, transcoding, AI chapters, captions, streaming)
- **GPT-4 Vision** – frame-by-frame context analysis
- **Wan 2.5** (via Wavespeed API) – generates seamless ad videos
- **FFmpeg** – lossless stitching

---

## The Problem

Traditional video advertising suffers from:
- Jarring interruptions that break immersion
- Generic ads unrelated to content
- Manual editing (expensive & slow)
- High viewer drop-off (65% skip pre-rolls in 5s, 45% drop-off on mid-rolls)

![problems](https://camo.githubusercontent.com/a4ed9aa14535fe4792ce21fe6827b12c09c317d03152ebe51c24df16d8219f00/68747470733a2f2f6465762d746f2d75706c6f6164732e73332e616d617a6f6e6177732e636f6d2f75706c6f6164732f61727469636c65732f3779336d7876713077646c766b6a366137306e6b2e706e67)

---

## The Solution

Fully automated pipeline:

```
Original Video
   ↓ (Upload to Mux)
Mux auto-processes → transcoding, captions, AI chapters, thumbnails
   ↓
Detect natural transitions from Mux chapters
   ↓
GPT-4 Vision analyzes transition frames + product
   ↓
Generate optimized Wan 2.5 prompt
   ↓
Wan 2.5 creates 5–10s contextual ad video
   ↓
FFmpeg stitches ads at transition points (lossless)
   ↓
Re-upload to Mux → professional streaming with ad markers, chapters, multi-language captions
```

Result: Non-disruptive, narrative-first product placements.

![solutions](https://camo.githubusercontent.com/118ee55c779b1db890b0d70a3b1b4ecafedc937ca941f3d5b2a84edf7f36a38e/68747470733a2f2f6465762d746f2d75706c6f6164732e73332e616d617a6f6e6177732e636f6d2f75706c6f6164732f61727469636c65732f65636566756373773074766c35653362397666362e706e67)

---

## Getting Started

### Prerequisites
- Node.js ≥ 20.0.0
- npm ≥ 10.0.0
- FFmpeg ≥ 4.4

### Installation
```bash
git clone https://github.com/sumionochi/mux-ai-ads-placement.git
cd mux-ai-ads-placement
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

### Environment Variables (`.env.local`)
```env
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
OPENAI_API_KEY=your_openai_api_key
WAVESPEED_API_KEY=your_wavespeed_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### API Keys
- Mux: https://dashboard.mux.com/settings/access-tokens (full permissions)
- OpenAI: https://platform.openai.com/api-keys (ensure GPT-4 Vision access)
- Wavespeed (Wan 2.5): https://wavespeed.ai

### FFmpeg Installation
- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt install ffmpeg`
- Windows: Download from https://ffmpeg.org/download.html and add to PATH

---

## Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Upload to Mux                                           │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ User uploads video → Mux Direct Upload API              │    │
│ │         ↓                                               │    │
│ │ Mux processes video:                                    │    │
│ │  • Transcodes to multiple resolutions                   │    │
│ │  • Generates adaptive HLS stream                        │    │
│ │  • Creates captions via speech-to-text                  │    │
│ │  • Detects chapters using AI                            │    │
│ │  • Extracts thumbnail images                            │    │
│ │         ↓                                               │    │
│ │ Returns: Asset ID + Playback ID + Chapters              │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Generate Transition Opportunities                       │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Use Mux chapters as transition points                   │    │
│ │         ↓                                               │    │
│ │ For each chapter boundary:                              │    │
│ │  • Extract exit frame (Mux thumbnail)                   │    │
│ │  • Extract entry frame (next chapter thumbnail)         │    │
│ │  • Calculate gap duration                               │    │
│ │  • Create transition opportunity                        │    │
│ │         ↓                                               │    │
│ │ Result: 3-8 ad placement opportunities                  │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Generate AI Ad Videos                                   │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Use Mux thumbnails as reference frames                  │    │
│ │         ↓                                               │    │
│ │ GPT-4V analyzes Mux frames + product                    │    │
│ │         ↓                                               │    │
│ │ Wan 2.5 generates video using Mux thumbnail             │    │
│ │         ↓                                               │    │
│ │ Result: 5-10 second contextual ad videos                │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Download & Stitch                                       │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Download original from Mux HLS stream                   │    │
│ │         ↓                                               │    │
│ │ FFmpeg stitches ads into video                          │    │
│ │         ↓                                               │    │
│ │ Result: Final video with seamless ad integration        │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Upload Final Video to Mux                               │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Upload stitched video → Mux Direct Upload               │    │
│ │         ↓                                               │    │
│ │ Mux creates new asset with:                             │    │
│ │  • New Playback ID                                      │    │
│ │  • Auto-generated captions                              │    │
│ │  • HLS streaming ready                                  │    │
│ │  • Thumbnail generation                                 │    │
│ │         ↓                                               │    │
│ │ Display in Mux Player with:                             │    │
│ │  🟡 Yellow ad markers on timeline                       │    │
│ │  📚 Chapter navigation                                   │    │
│ │  📝 Closed captions                                     │    │
│ │  🌍 Multi-language support                              │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: AI Features (Powered by Mux Captions)                   │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Fetch Mux auto-generated captions (VTT)                 │    │
│ │         ↓                                               │    │
│ │ GPT-4 analyzes transcript:                              │    │
│ │  • Generates smart chapters with timestamps             │    │
│ │  • Creates video summary                                │    │
│ │  • Extracts relevant tags                               │    │
│ │         ↓                                               │    │
│ │ Integrate into Mux Player:                              │    │
│ │  • Chapters appear in player menu                       │    │
│ │  • Summary shown in metadata                            │    │
│ │  • Enhanced navigation                                  │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Multi-Language Captions                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Fetch English captions from Mux                         │    │
│ │         ↓                                               │    │
│ │ GPT-4 translates to 5 languages                         │    │
│ │         ↓                                               │    │
│ │ Add translated tracks to Mux Player                     │    │
│ │         ↓                                               │    │
│ │ Result: Captions in 6 languages with language selector  │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Features

1. **Automatic Scene Detection** – Uses Mux AI chapters for natural transition points
2. **Context-Aware Analysis** – GPT-4 Vision analyzes exit/entry frames + product
3. **Two Modes**
   - Template Mode (recommended): Proven prompt template for consistent results
   - AI Mode: Fully custom scene-specific prompts
4. **Product Input**
   - Image upload → GPT-4V auto-extracts detailed description
   - Text description → direct template insertion
5. **Ad Video Generation** – Wan 2.5 creates 5–10s ads that match original style
6. **Lossless Stitching** – FFmpeg `-c copy` concatenation (no re-encoding)
7. **Professional Delivery** – Mux Player with:
   - Yellow ad markers on timeline
   - AI-generated chapters
   - Multi-language captions (6 languages)
   - Adaptive streaming
8. **AI Metadata** – Auto-generated summary, title, tags

---

### **Key Innovation:**

1. **🔍 GPT-4 Vision Analysis** - Understands visual context and scene transitions
2. **🎨 AI Ad Generation** - Creates custom ads using Wan 2.5 that match video aesthetics
3. **🎬 Seamless Integration** - Stitches ads at natural transition points using FFmpeg
4. **📊 Professional Delivery** - Mux-powered streaming with advanced features

---

## ✨ **Features**

### **🎥 Phase 1: Intelligent Video Analysis**

#### **Automatic Scene Detection**

- **Mux AI integration** for precise chapter identification
- Auto-generated captions and metadata extraction
- Extracts frames at exact transition timestamps
- Generates visual previews for every detected scene change

**Technical Implementation:**

```typescript
// Mux upload with auto-captions
const upload = await mux.video.uploads.create({
  new_asset_settings: {
    playbook_policy: ["public"],
    inputs: [
      {
        generated_subtitles: [
          {
            language_code: "en",
            name: "English (Auto)",
          },
        ],
      },
    ],
  },
});
```

#### **Mux Upload & Processing**

- Direct upload via Mux API with progress tracking
- Automatic transcoding to adaptive bitrate formats
- Auto-generated captions (English)
- Chapter detection using Mux AI workflows
- Thumbnail generation for preview

---

### **🤖 Phase 2: AI-Powered Context Analysis**

#### **GPT-4 Vision Frame Analysis**

- **Dual-frame context understanding** - Analyzes exit & entry frames
- **Visual scene comprehension** - Identifies objects, settings, mood, tone
- **Temporal gap calculation** - Determines optimal ad duration
- **Placement strategy generation** - Suggests best integration approach

**AI Analysis Pipeline:**

```typescript
Input: { frameA_image, frameB_image, product_info, mode }
       ↓
GPT-4V Vision Analysis
       ↓
Output: {
  productName: "Exact product identification",
  detailedProductDescription: "Brand, colors, materials, features...",
  integrationStrategy: "Natural placement approach",
  reasoning: "Why this approach works for these frames",
  wanPrompt: "Complete video generation prompt",
  duration: 5
}
```

#### **Two Analysis Modes:**

**1. Template Mode (Recommended)**

- Uses proven hardcoded prompt template
- Extracts detailed product description from image
- Inserts into optimized Wan 2.5 prompt
- Consistent, narrative-first integration
- Higher success rate for natural-looking ads

**2. AI Mode (Custom)**

- Full custom analysis with scene-specific prompts
- Tailored to specific transition context
- More creative but variable results
- Best for unique or complex scenarios

#### **Two Input Methods:**

**1. Image Upload Mode**

- Product image → GPT-4V analysis
- Automatic product identification with extreme detail
- Brand, color, material, and feature extraction
- Logo placement and design analysis

**2. Text Description Mode**

- Text prompt → Direct template insertion
- Detailed product description generation
- Style and tone suggestions
- Visual characteristics inference

---

### **🎨 Phase 3: AI Video Ad Generation**

#### **Wan 2.5 Integration**

- **Context-aware prompts** generated by GPT-4
- **Style matching** to original video aesthetics
- **Duration control** (5-10 seconds)
- **High-quality output** (720p, optimized for web)

**Generation Workflow:**

```
Product Analysis → Prompt Engineering → Wan API Call → Video Synthesis
       ↓                    ↓                  ↓              ↓
  "Red Coke Can"    "Professional ad    Wan 2.5 API     Generated
  + Context        showing Coke can                     5-sec ad
                   on office desk..."
```

**Sample Generated Prompt:**

```
Continue seamlessly from the provided image reference (it is the FIRST FRAME).
Preserve the exact same style, character design, linework, shading, environment,
lighting logic, and camera feel. Let the reference image determine the setting
and cinematography.

Goal: a natural in-world product placement that feels like part of the story
(NOT a commercial cutaway). Integrate the product described below as a real
physical object that belongs in the scene:
- Match the product description exactly (shape, materials, colors, logo placement)
- Correct scale relative to the characters and room
- Correct perspective + occlusion + contact with consistent shadows and reflections
- Keep the scene narrative-first; the product is revealed through a motivated action

PRODUCT DESCRIPTION (exact, do not alter):
[Detailed product description extracted by GPT-4V]
```

---

### **🔧 Phase 4: Professional Video Stitching**

#### **FFmpeg-Powered Assembly**

- **Frame-accurate insertion** at transition points
- **Audio continuity** preservation
- **Quality retention** (no re-encoding artifacts)
- **Multi-ad support** - stitch multiple ads in one pass

**Stitching Algorithm:**

```bash
# 1. Download original video from Mux HLS stream
ffmpeg -i "https://stream.mux.com/PLAYBACK_ID.m3u8" original.mp4

# 2. Split original video at transition points
ffmpeg -i original.mp4 -ss 0 -to 67.5 -c copy segment_1.mp4
ffmpeg -i original.mp4 -ss 72.5 -to 180 -c copy segment_2.mp4

# 3. Create concat list
echo "file segment_1.mp4" > concat.txt
echo "file ad_1.mp4" >> concat.txt
echo "file segment_2.mp4" >> concat.txt

# 4. Seamless concatenation
ffmpeg -f concat -safe 0 -i concat.txt -c copy final.mp4
```

**Selection System:**

- ✅ Checkbox-based ad selection
- 📊 Real-time preview before stitching
- 🔄 Re-stitch with different combinations
- 💾 Download locally or upload to Mux

---

### **🎬 Phase 5: Mux Player Integration**

#### **Professional Video Player**

- **Adaptive bitrate streaming** via HLS
- **Custom UI controls** with brand colors
- **Responsive design** for all screen sizes
- **Keyboard shortcuts** for accessibility

#### **Visual Ad Markers**

```typescript
// Yellow markers appear on timeline showing ad placements
adMarkers={[
  { time: 67.5, duration: 5.0, label: "Coke Ad" },
  { time: 145.2, duration: 7.5, label: "iPhone Ad" }
]}
```

**Features:**

- 🟡 **Hover-to-show** - Markers fade in on mouse hover
- 📍 **Precise positioning** - Calculated as percentage of total duration
- ⏱️ **Duration-accurate** - Marker width reflects actual ad length
- 🎯 **Interactive** - Click markers to jump to ad segments

**Visual Implementation:**

```tsx
{
  /* Yellow overlay markers on timeline */
}
<div
  style={{
    left: `${(adTime / totalDuration) * 100}%`,
    width: `${(adDuration / totalDuration) * 100}%`,
    backgroundColor: "#FFD700",
    opacity: isHovering ? 0.9 : 0,
    transition: "opacity 300ms",
  }}
/>;
```

---

### **🧠 Phase 6: AI-Generated Metadata**

#### **Smart Chapter Generation**

- **Mux caption analysis** - Reads auto-generated VTT files
- **GPT-4 processing** - Identifies logical chapter breaks
- **Timestamp extraction** - Maps chapters to video timeline
- **Title generation** - Creates descriptive chapter names

**Chapter Structure:**

```typescript
{
  startTime: 0,      // seconds
  title: "Introduction to Product Features"
},
{
  startTime: 45,
  title: "Technical Specifications Deep Dive"
}
```

**Integration:**

- 📚 Appears in Mux Player chapter menu
- ⌨️ Keyboard navigation (Ctrl + →/←)
- 🔍 Searchable chapter list
- 🎯 Click to jump to chapter

#### **AI Video Summary**

- **Title generation** - SEO-optimized video title
- **Description** - Comprehensive 2-3 sentence summary
- **Tag extraction** - Relevant keywords for discoverability

**Example Output:**

```json
{
  "title": "Complete iPhone 15 Pro Review: Features & Performance",
  "description": "An in-depth analysis of the iPhone 15 Pro...",
  "tags": ["technology", "smartphone", "Apple", "review", "2024"]
}
```

---

### **🌍 Phase 7: Multi-Language Support**

#### **Caption Translation**

- **5 target languages:** Spanish, French, German, Japanese, Hindi
- **GPT-4 translation** - Context-aware, natural translations
- **VTT format preservation** - Maintains timing and formatting
- **Mux Player integration** - Native caption selector UI

**Translation Pipeline:**

```
English Captions (VTT) → Parse Text → GPT-4 Translate → Reconstruct VTT
         ↓                    ↓              ↓                ↓
   "Hello world"      Extract lines    "Hola mundo"    Updated VTT
   00:00:01 → 00:00:03                 (Spanish)        with timing
```

**Languages Available:**

- 🇬🇧 English (Original)
- 🇪🇸 Spanish (Español)
- 🇫🇷 French (Français)
- 🇩🇪 German (Deutsch)
- 🇯🇵 Japanese (日本語)
- 🇮🇳 Hindi (हिन्दी)

---

## Tech Stack

**Frontend**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI
- @mux/mux-player-react

**Backend**
- Next.js API Routes
- FFmpeg + fluent-ffmpeg
- Sharp (image processing)

**Services**
- Mux (video infrastructure + AI)
- OpenAI (GPT-4o, GPT-4o-mini)
- Wavespeed Wan 2.5 (video generation)

---

## Cost Analysis (Approximate, USD)

Costs vary by usage and volume tiers. Always check official pricing pages for latest rates.

| Service                  | Basis                     | Approximate Rate                          | Notes                                      |
|--------------------------|---------------------------|-------------------------------------------|--------------------------------------------|
| Mux Video Encoding       | per minute encoded        | $0.0014–$0.008 per min (resolution-based) | Volume discounts apply                     |
| Mux Video Storage        | per GB-month              | ~$0.04/GB-month                           |                                            |
| Mux Video Delivery       | per minute delivered      | First tier ~$0.001–$0.0012/min            | Often includes free allowance              |
| OpenAI GPT-4o            | per 1M tokens             | $2.50 input / $10.00 output               | Vision requests billed by image tokens      |
| OpenAI GPT-4o-mini       | per 1M tokens             | $0.15 input / $0.60 output                | Used for summaries/translations            |
| Wan 2.5 (Wavespeed)      | per second generated      | ~$0.05–$0.15/sec (resolution-based)       | Check Wavespeed for exact/current rates    |

**Estimated per 5-min video with 3 ads**: Very low ($1–$5) at small scale.

Links:
- [Mux Pricing](https://www.mux.com/pricing)
- [OpenAI Pricing](https://openai.com/api/pricing)
- [Wavespeed](https://wavespeed.ai)

---

## Future Roadmap

**Short-term**
- Batch processing
- Ad template library
- A/B testing variations
- Analytics dashboard

**Medium-term**
- Real-time ad preview
- White-label branding
- Collaborative editing

**Long-term**
- Live stream ad insertion
- Public API
- Mobile apps

---

## Troubleshooting

Common issues and fixes:

- **Mux upload fails** → Verify token ID/secret, test with curl
- **GPT-4V fails** → Check OpenAI key, credits, and GPT-4 Vision access
- **Wan generation stuck** → Check Wavespeed key/quota
- **FFmpeg not found** → Reinstall and ensure in PATH
- **Stitching fails** → Check disk space, file permissions in `/tmp`

---

## Use Cases

- Content creators (YouTube, courses)
- Marketing agencies
- E-commerce product videos
- Streaming platforms
- Corporate training/comms

---

## Acknowledgments

Thanks to:
- Mux – incredible video platform
- OpenAI – GPT-4 Vision & text models
- Wavespeed – Wan 2.5 API access
- Next.js, Vercel, shadcn/ui, Tailwind, Radix

**Powered by Mux • OpenAI • Wan 2.5 • Next.js**

---

🎉 Thank you for checking out Mux AI Ads Placement!  
The future of video advertising: ads that enhance the story, not interrupt it.
