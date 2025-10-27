# ClipForge UI Components

Complete component library for ClipForge video editor UI.

## Base UI Components

### Core Input Components
- **Button** (`src/renderer/components/ui/Button.jsx`)
  - Variants: primary, secondary, ghost, outline
  - Sizes: small, medium, large
  - Icon-only, text-only, icon+text variants
  - Loading and disabled states
- **Input** (`src/renderer/components/ui/Input.jsx`)
  - Text input with error states
  - Focus indicators
  - Disabled state
- **Slider** (`src/renderer/components/ui/Slider.jsx`)
  - Horizontal slider with value display
  - Customizable min/max/step
- **Switch** (`src/renderer/components/ui/Switch.jsx`)
  - Toggle switch with smooth animation
  - Checked/unchecked states
- **Dropdown** (`src/renderer/components/ui/Dropdown.jsx`)
  - Custom dropdown with search capability
  - Keyboard navigation support

### Layout Components
- **Card** (`src/renderer/components/ui/Card.jsx`)
  - Elevated cards with borders
  - Multiple variants (default, elevated, subtle)
  - Hover effects
- **Badge** (`src/renderer/components/ui/Badge.jsx`)
  - Status badges with color variants
  - Size variants

### Feedback Components
- **Toast** (`src/renderer/components/ui/Toast.jsx`)
  - 4 types: success, error, warning, info
  - Auto-dismiss with configurable duration
  - Manual dismiss option
  - Slide-in animation
- **Modal** (`src/renderer/components/ui/Modal.jsx`)
  - Modal dialog with backdrop
  - Size variants (sm, md, lg, xl, full)
  - Header with close button
  - Smooth entrance/exit animation
- **ContextMenu** (`src/renderer/components/ui/ContextMenu.jsx`)
  - Right-click context menu
  - Keyboard shortcuts display
  - Separator support
  - Destructive action styling

## Feature Components

### Media Library
- **MediaLibrary** (`src/renderer/components/features/MediaLibrary/MediaLibrary.jsx`)
  - File list container with search and sort
  - Empty state handling
  - Import button
- **FileCard** (`src/renderer/components/features/MediaLibrary/FileCard.jsx`)
  - Thumbnail placeholder
  - File metadata (name, duration, size, resolution)
  - Delete button on hover
  - Selection state

### Video Player
- **VideoPlayer** (`src/renderer/components/features/Player/VideoPlayer.jsx`)
  - Player container with controls overlay
  - Play/Pause, skip, volume controls
  - Timeline scrubber
  - Auto-hide controls
  - Current time / total duration display

### Timeline Editor
- **Timeline** (`src/renderer/components/features/Timeline/Timeline.jsx`)
  - Timeline container with zoom controls
  - Split and snap-to-grid toggles
  - Playback rate selector
- **TimeRuler** (`src/renderer/components/features/Timeline/TimeRuler.jsx`)
  - Time markers with major/minor ticks
  - Zoom-aware scaling
  - Time labels
- **Playhead** (`src/renderer/components/features/Timeline/Playhead.jsx`)
  - Vertical playhead line
  - Time label display
  - Red accent styling
- **Track** (`src/renderer/components/features/Timeline/Track.jsx`)
  - Track container with controls
  - Volume slider
  - Visibility and lock toggles
  - Delete button
- **Clip** (`src/renderer/components/features/Timeline/Clip.jsx`)
  - Clip block with gradient background
  - Thumbnail and name
  - Selection and hover states
  - Trim handles (visual)

### Settings Panel
- **SettingsPanel** (`src/renderer/components/features/Settings/SettingsPanel.jsx`)
  - Category navigation sidebar
  - Active category indicator
  - Reset, Export, Import buttons
- **AppearanceSettings** (`src/renderer/components/features/Settings/AppearanceSettings.jsx`)
  - Theme color pickers
  - Typography settings
  - Spacing and layout controls
  - Visual effects toggles
- **EditorSettings** (`src/renderer/components/features/Settings/EditorSettings.jsx`)
  - Timeline preferences
  - Player settings
  - Performance options
- **RecordingSettings** (`src/renderer/components/features/Settings/RecordingSettings.jsx`)
  - Recording quality presets
  - Source selection
  - Resolution and frame rate selectors
- **ExportSettings** (`src/renderer/components/features/Settings/ExportSettings.jsx`)
  - Export quality settings
  - Format selection
  - Advanced encoding options
- **AdvancedSettings** (`src/renderer/components/features/Settings/AdvancedSettings.jsx`)
  - App behavior settings
  - Storage management
  - Update preferences

## Utilities

- **cn()** (`src/renderer/lib/utils.js`)
  - Conditional className merging
  - Combines clsx and tailwind-merge

## Design System

### Colors
- Primary: Indigo (#6366f1)
- Secondary: Purple (#8b5cf6)
- Background: Zinc (#18181b)
- Surface: Zinc-900/40
- Borders: White/10

### Typography
- Font Family: Inter (default)
- Base Font Size: 14px (adjustable via settings)
- Font Weights: Regular, Medium, Semi-Bold, Bold

### Spacing
- Base Unit: 4px
- Scales: 0, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64

### Border Radius
- Default: 8px (adjustable via settings)
- Scale: 0, 2, 4, 6, 8, 12, 16, 24px

### Shadows
- Default shadow intensity: 3/5 (adjustable via settings)
- Uses CSS blur and opacity for depth

## Component Usage

```jsx
import { Button } from '@/components/ui/Button';
import { ToastContainer } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';

// Example usage
<Button variant="primary" size="md" icon={<Play />}>
  Play
</Button>

<Modal isOpen={isOpen} onClose={handleClose} title="Confirm">
  <p>Are you sure?</p>
</Modal>
```

## State Management

Currently using local component state. Future integration planned with Zustand stores for:
- Theme settings (appearance, colors, typography)
- Editor preferences (timeline, player settings)
- UI state (panel visibility, sizes)
- Media data (file list, selected files)
- Timeline data (tracks, clips, playhead position)

## Accessibility

- All interactive elements have focus indicators
- Keyboard navigation support
- ARIA labels where appropriate
- Color contrast meets WCAG AA standards
- Disabled states properly styled

