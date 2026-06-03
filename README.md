# Marshall Motion Studio

Internal tool for generating animated photo collages.

## Setup

```bash
npm install
npm run dev
```

## Environment variables

Create `.env.local` with:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
ANTHROPIC_API_KEY=sk-ant-...

# For Remotion Lambda export (optional during development):
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
REMOTION_LAMBDA_FUNCTION_NAME=...
REMOTION_SERVE_URL=...
```

## Features

### Format & size
- 5 aspect ratios: 1:1, 16:9, 9:16, 4:5, 5:4
- 3 size tiers: Low, Medium, High
- Format affects both canvas preview and export resolution

### Canvas controls (Blender-style)

| Action | Result |
|--------|--------|
| Click panel | Select |
| Click background | Deselect |
| Spacebar + drag | Move X/Y |
| Spacebar + Shift + drag | Move Z (depth) |
| Mouse drag | Rotate Y/X |
| Shift + mouse drag | Rotate Z (twist) |
| Backspace / Delete | Remove selected panel |
| Esc | Cancel and revert |

### Upload
- Accepts PNG, JPG, GIF (animated), WEBP
- Max 50MB per file
- Per-file error messages with specific reasons
- Warning dialog for files over 5MB

## Project structure

```
app/
  page.tsx              # Main editor UI
  layout.tsx
  globals.css
  api/
    upload/route.ts     # Vercel Blob upload
    render/route.ts     # Remotion Lambda render trigger
components/
  CollagePreview.tsx    # 3D canvas with Remotion Player
  ControlPanel.tsx      # Right-side controls
  ImageUploader.tsx     # Drag-drop uploader
  TransformHUD.tsx      # Mode indicator overlay
lib/
  useTransformControls.ts  # Keyboard/mouse handling
  utils.ts
remotion/
  src/
    Root.tsx            # Composition definitions (15 total)
    Collage.tsx         # Scene
    Panel.tsx           # Single image panel
    types.ts            # Format/size/panel types
    generation.ts       # Initial panel placement
    index.ts
```

## Render export

`npm run remotion:lambda:deploy` deploys/updates the Lambda function and serve site.

After deployment, set `REMOTION_LAMBDA_FUNCTION_NAME` and `REMOTION_SERVE_URL` in Vercel environment variables.
