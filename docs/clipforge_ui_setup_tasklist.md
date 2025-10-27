# ClipForge UI Setup Task List

## Overview
This task list outlines the complete UI/visual setup for ClipForge **without any functional implementation**. The goal is to create a beautiful, highly customizable interface that can be iterated on visually before adding functionality. All components will be static/dummy data placeholders.

**Important**: This phase is about visual design and layout only. No actual video processing, imports, exports, or recording will be implemented.

---

## 1. Design System Foundation

### 1.1 Core Design Tokens
- [ ] Define color palette structure:
  - Primary colors (default blue/purple gradient theme)
  - Secondary colors
  - Background colors (dark mode)
  - Surface colors (panels, cards)
  - Text colors (primary, secondary, muted)
  - Border colors
  - Accent colors for interactive elements
  - Success, warning, error colors
- [ ] Define typography scale:
  - Font families (primary sans-serif, monospace for code/timestamps)
  - Font sizes (xs, sm, base, lg, xl, 2xl, 3xl)
  - Font weights (light, normal, medium, semibold, bold)
  - Line heights
  - Letter spacing
- [ ] Define spacing scale:
  - Base unit (4px or 8px)
  - Scale: 0, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64
- [ ] Define border radius scale:
  - sm, md, lg, xl, 2xl, full
- [ ] Define shadow scale:
  - sm, md, lg, xl, 2xl (for depth and elevation)
- [ ] Define transition/timing:
  - Duration scale (fast, normal, slow)
  - Easing functions (ease-in, ease-out, ease-in-out)
- [ ] Create Tailwind config with all custom tokens

### 1.2 Theme System
- [ ] Create theme provider/context
- [ ] Define default theme (dark modern)
- [ ] Create theme storage mechanism (localStorage)
- [ ] Build theme switching infrastructure
- [ ] Support for typeface selection (Sans-serif, Monospace)

---

## 2. Component Library (Visual Only)

### 2.1 Base UI Components
- [ ] **Button Component**:
  - Primary, secondary, ghost, outline variants
  - Small, medium, large sizes
  - Icon-only, text-only, icon+text variants
  - Loading state (spinner)
  - Disabled state
  - Hover and active states
- [ ] **Input Component**:
  - Text input
  - Number input with increment/decrement controls
  - Textarea
  - Search input with icon
  - All states: default, focus, error, disabled
- [ ] **Slider Component**:
  - Horizontal slider with track, thumb, value display
  - Range slider variant
  - Customizable min/max/step
  - Tooltip showing current value on hover
- [ ] **Dropdown/Select Component**:
  - Custom dropdown with search
  - Multi-select variant
  - Disabled state
  - Clear selection option
- [ ] **Checkbox Component**:
  - Standard checkbox
  - Indeterminate state
  - Custom styled checkmark
- [ ] **Radio Button Component**:
  - Radio group container
  - Individual radio buttons
- [ ] **Switch/Toggle Component**:
  - Animated toggle switch
  - On/off states with smooth transition
- [ ] **Tab Component**:
  - Horizontal tabs
  - Active/inactive states
  - Optional icon support
- [ ] **Card Component**:
  - Elevated card
  - Elevated card with border
  - Subtle card variant
  - Hover effects
- [ ] **Badge/Label Component**:
  - Colored badges for status/tags
  - Removable badges
- [ ] **Progress Bar Component**:
  - Linear progress bar
  - Determinate and indeterminate variants
  - With percentage display
- [ ] **Modal/Dialog Component**:
  - Backdrop overlay
  - Centered modal container
  - Header, body, footer sections
  - Close button
  - Confirm/Cancel action buttons
- [ ] **Tooltip Component**:
  - Hover tooltip
  - Position variants (top, bottom, left, right)
  - Arrow indicator
- [ ] **Divider Component**:
  - Horizontal divider
  - With optional label

### 2.2 Icon Integration
- [ ] Install icon library (Lucide React recommended)
- [ ] Create icon component wrapper
- [ ] Define icon usage patterns (size, color variants)
- [ ] Add essential icons: play, pause, stop, skip, record, import, export, settings, etc.

### 2.3 Layout Components
- [ ] **Grid Layout System**:
  - Responsive grid container
  - Column variants (1-12 columns)
  - Gap spacing
- [ ] **Flex Container**:
  - Row/column flex containers
  - Wrap variants
  - Alignment utilities
- [ ] **Split Panels**:
  - Resizable split panel component
  - Horizontal and vertical splits
  - Drag handle for resizing

---

## 3. Main Application Layout

### 3.1 Window Structure
- [ ] Create main window frame (no browser chrome)
- [ ] Custom title bar with window controls (close, minimize, maximize)
- [ ] Window drag region
- [ ] Responsive minimum/maximum window sizes
- [ ] Restore window state on launch (size, position)

### 3.2 Primary Layout
- [ ] Create 3-panel layout container:
  - **Left Panel**: Media Library (resizable, min 200px, max 400px)
  - **Center Panel**: Video Player (flexible, always visible)
  - **Right Panel**: Settings/Info (collapsible, default hidden)
- [ ] **Bottom Panel**: Timeline Editor (fixed height, resizable up to 50% of screen)
- [ ] Implement panel visibility toggles
- [ ] Add splitter handles between panels with drag resize
- [стиль] Remember panel sizes in localStorage

### 3.3 Top Bar / Navigation
- [ ] Create top navigation bar:
  - **Left Section**: App logo and title
  - **Center Section**: Primary actions (Import, Record, Export buttons)
  - **Right Section**: Window controls (minimize, maximize, close)
- [ ] Optional menu bar (File, Edit, View, etc.)
- [ ] Status indicator (ready/saving/processing)
- [ ] Undo/Redo buttons (disabled by default for now)

---

## 4. Media Library Panel

### 4.1 Panel Structure
- [ ] Create left-side panel container
- [色彩] Panel header with title "Media Library" and import button
- [ ] Scrollable content area
- [ ] Empty state placeholder when no media

### 4.2 File Card Component
- [ ] Create file card for each imported item:
  - [ ] Large thumbnail placeholder (16:9 aspect ratio)
  - [ ] File name (truncate if too long)
  - [ ] Duration badge (e.g., "2:34")
  - [ ] File size badge (e.g., "45 MB")
  - [ ] Resolution badge (e.g., "1920x1080")
  - [ ] Hover effect (slight elevation)
  - [ ] Selected state (border highlight)
  - [ ] Delete button (appears on hover)

### 4.3 Media Library Features (Placeholder)
- [ ] Show 3-5 dummy file cards with sample data
- [ ] Search/filter bar (non-functional)
- [ ] Sort dropdown (Name, Date, Duration, Size) - non-functional
- [ ] Import button with visual feedback
- [ ] Grid/list view toggle (visual only)

---

## 5. Video Player Panel

### 5.1 Player Container
- [ ] Create center video player container
- [ ] Responsive container maintaining 16:9 aspect ratio
- [ ] Centered placeholder with video icon
- [ ] "Drop video here" placeholder state
- [ ] Inset shadow for depth

### 5.2 Player Controls Overlay
- [ ] Create floating control bar at bottom:
  - [ ] Play/Pause button (large, center)
  - [ ] Previous/Next clip buttons
  - [ ] Skip backward/forward buttons (10s, 30s)
  - [ ] Volume control slider
  - [ ] Fullscreen button
  - [ ] Settings button
- [ ] Show controls on hover/focus
- [ ] Auto-hide controls after inactivity
- [ ] Timeline scrubber bar (non-functional, static):
  - [ ] Progress bar
  - [ ] Buffer indicator (placeholder)
  - [ ] Thumbnails on hover (placeholder image)
  - [ ] Current time / total duration display

### 5.3 Picture-in-Picture (PiP) Overlay
- [ ] Create PiP container for webcam preview
- [ ] Position in corner (configurable)
  - Top-left
  - Top-right
  - Bottom-left
  - Bottom-right
- [ ] Resizable handles
- [ ] Close button
- [ ] Border with subtle shadow
- [ ] Sample placeholder for preview

---

## 6. Timeline Editor Panel

### 6.1 Timeline Container
- [ ] Create bottom timeline panel
- [ ] Vertical split between ruler and tracks
- [ ] Horizontal scroll for timeline navigation
- [ ] Scrollbar styling

### 6.2 Time Ruler
- [ ] Create ruler header showing time markers
- [ ] Major tick marks (seconds)
- [ ] Minor tick marks (sub-seconds)
- [ ] Time labels below ruler
- [ ] Zoom indicator showing current zoom level
- [ ] Current time indicator (playhead line)

### 6.3 Playhead
- [ ] Vertical playhead line through all tracks
- [ ] Red accent color with shadow
- [ ] Time label at top of playhead
- [ ] Draggable handle (visual only for now)

### 6.4 Track Structure
- [ ] Create track container component
- [ ] Track labels on left:
  - [ ] Track name/icon
  - [ ] Volume control
  - [ ] Track visibility toggle
  - [ ] Track lock toggle
  - [ ] Delete track button
- [ ] Multiple track rows (2-4 tracks for MVP)
- [ ] Alternating background colors for track rows
- [ ] Optional: Grid lines for snap-to-grid visual guide

### 6.5 Clip Component (Placeholder)
- [ ] Create clip block for each video clip:
  - [ ] Rectangular block on track
  - [ ] Gradient background (color-coded by file)
  - [ ] Clip thumbnail at left edge
  - [ ] Clip name label
  - [ ] Duration indicator
  - [ ] Selected state (highlighted border)
  - [ ] Hover effect (slight scale/elevation)
- [ ] Trim handles on left/right edges (visual only):
  - [ ] Left trim handle
  - [ ] Right trim handle
  - [ ] Drag visual feedback (cursor changes)
- [ ] Show 3-5 sample clips on timeline
- [ ] Overlapping clips visualization

### 6.6 Timeline Controls
- [ ] Zoom controls (zoom in, zoom out, fit to timeline)
- [ ] Snap to grid toggle
- [ ] Split clip button (non-functional)
- [ ] Playback rate selector (0.5x, 1x, 1.5x, 2x) - visual only

---

## 7. Settings Panel

### 7.1 Settings Panel Structure
- [ ] Create collapsible right-side panel
- [ ] Panel toggle button in top navigation
- [ ] Settings sidebar with categories:
  - [ ] Appearance
  - [ ] Editor
  - [ ] Recording
  - [ ] Export
  - [ ] Advanced
- [ ] Active category indicator
- [ ] Smooth panel slide-in/out animation

### 7.2 Appearance Settings

#### 7.2.1 Theme Customization
- [ ] Primary color picker
- [ ] Secondary color picker
- [ ] Background color picker
- [ ] Surface color picker
- [ ] Accent color picker
- [ ] Preview swatch showing selected colors
- [ ] Preset themes dropdown:
  - Dark Modern (default)
  - Light Mode
  - High Contrast
  - Custom
  - Custom theme save/load buttons

#### 7.2.2 Typography Settings
- [ ] Primary font family dropdown (Google Fonts integration or system fonts)
- [ ] Monospace font family dropdown
- [ ] Base font size slider (12px - 18px)
- [ ] Font weight dropdown (Light, Regular, Medium, Semi-Bold, Bold)
- [ ] Line height slider (1.2 - 2.0)
- [ ] Preview text showing settings

#### 7.2.3 Spacing Settings
- [ ] Base spacing unit slider (4px - 8px)
- [ ] Component padding intensity slider
- [ ] Panel gap slider
- [ ] Border radius style slider (0px - 24px)
- [ ] Visual preview showing spacing

#### 7.2.4 Shadow & Depth Settings
- [ ] Shadow intensity slider
- [ ] Elevation levels (1-5) preview
- [ ] Shadow blur radius slider
- [ ] Shadow color opacity slider
- [ ] Disable shadows toggle

#### 7.2.5 Animation Settings
- [ ] Animation speed slider (0.5x - 2x)
- [ ] Transition duration slider (50ms - 500ms)
- [ ] Easing curve selector
- [ ] Disable animations toggle (for accessibility)
- [ ] Preview animation button

#### 7.2.6 Visual Effects
- [ ] Blur intensity slider
- [ ] Glassmorphism effect toggle
- [ ] Frosted glass opacity slider
- [ ] Panel opacity slider
- [ ] Border visibility toggle
- [ ] Border thickness slider

### 7.3 Editor Settings

#### 7.3.1 Timeline Settings
- [ ] Default zoom level slider
- [ ] Snap grid size slider (0.1s - 5s)
- [ ] Show grid lines toggle
- [ ] Clip thumbnail size dropdown
- [ ] Track height slider
- [ ] Auto-snap to other clips toggle

#### 7.3.2 Player Settings
- [ ] Default playback rate selector
- [ ] Auto-play on import toggle
- [ ] Loop playback toggle
- [ ] Show waveform toggle (placeholder)
- [ ] Show visualizers toggle
- [ ] Control bar auto-hide delay slider (1s - 10s)

#### 7.3.3 Performance Settings
- [ ] Enable hardware acceleration toggle
- [ ] Video cache size slider (GB)
- [ ] Thumbnail quality selector (Low, Medium, High)
- [ ] Preview quality selector (Low, Medium, High)

### 7.4 Recording Settings

#### 7.4.1 Default Recording Quality
- [ ] Resolution selector (720p, 1080p, 1440p, 4K)
- [ ] Frame rate selector (24, 30, 60 FPS)
- [ ] Video codec selector (placeholder)
- [ ] Audio quality selector (placeholder)

#### 7.4.2 Source Settings
- [ ] Default audio input dropdown (placeholder)
- [ ] Default video input dropdown (placeholder)
- [ ] Monitor audio level slider
- [ ] Preview recording overlay toggle

### 7.5 Export Settings

#### 7.5.1 Default Export Quality
- [ ] Resolution selector
- [ ] Frame rate selector
- [ ] Bitrate slider (kbps)
- [ ] Codec selector (placeholder)
- [ ] Output format selector (MP4, MOV, WebM)

#### 7.5.2 Advanced Export
- [ ] Two-pass encoding toggle
- [ ] Hardware acceleration toggle
- [ ] Preset profiles dropdown (Fast, Balanced, High Quality)

### 7.6 Advanced Settings

#### 7.6.1 App Behavior
- [ ] Auto-save project interval slider (minutes)
- [ ] Maximum undo history slider (5 - 100)
- [ ] Show console toggle (for debugging)
- [ ] Enable analytics toggle
- [ ] Crash reporting toggle

#### 7.6.2 Storage
- [ ] Cache directory selector
- [ ] Max cache size slider (GB)
- [ ] Clear cache button
- [ ] Temp files location selector

#### 7.6.3 Updates
- [ ] Auto-update toggle
- [ ] Update channel selector (Stable, Beta)
- [ ] Check for updates button

### 7.7 Settings Actions
- [ ] Reset to defaults button
- [ ] Export settings button (save as JSON)
- [ ] Import settings button (load from JSON)
- [ ] Apply changes button (for complex settings)
- [ ] Cancel button (revert unsaved changes)

---

## 8. Additional UI Elements

### 8.1 Context Menus
- [ ] Right-click context menu for clips
- [ ] Right-click context menu for timeline
- [ ] Right-click context menu for media library
- [ ] Context menu styling (subtle, modern)
- [ ] Keyboard shortcuts display in menus

### 8.2 Notifications/Toast Messages
- [ ] Toast notification system
- [ ] Success notifications (green)
- [ ] Error notifications (red)
- [ ] Warning notifications (yellow)
- [ ] Info notifications (blue)
- [ ] Auto-dismiss timer
- [ ] Manual dismiss option

### 8.3 Loading States
- [ ] Page loading spinner
- [ ] Button loading spinner
- [ ] Skeleton loaders for content
- [ ] Progress indicators

### 8.4 Empty States
- [ ] Media Library empty state
- [ ] Timeline empty state
- [ ] Player empty state
- [ ] Helpful messaging and CTAs

### 8.5 Keyboard Shortcuts Panel
- [ ] Keyboard shortcut modal/dialog
- [ ] Categorized shortcuts:
  - Playback
  - Timeline Editing
  - Navigation
  - General
- [ ] Search for shortcut feature
- [ ] Custom key binding capability (visual only)
- [ ] Export shortcuts to file

---

## 9. Responsive Design & Behavior

### 9.1 Window Resizing
- [ ] Panels resize proportionally
- [ ] Minimum size constraints for each panel
- [ ] Panels collapse to icons when too small
- [ ] Media Library collapses to icon-only list view
- [ ] Settings panel becomes a modal on small windows

### 9.2 Adaptive Layouts
- [ ] Compact mode for smaller windows
- [ ] Full-screen player mode
- [ ] Timeline-only view (hide other panels)
- [ ] Dual-monitor support hints

### 9.3 Touch Support (Optional)
- [ ] Touch-friendly button sizes
- [ ] Gesture hints
- [ ] Touch-optimized controls

---

## 10. Polish & Refinement

### 10.1 Visual Polish
- [ ] Ensure consistent spacing throughout
- [ ] Verify color contrast ratios (WCAG AA)
- [ ] Smooth transitions on all interactive elements
- [ ] Hover states on all clickable elements
- [ ] Focus states for keyboard navigation
- [ ] Active/pressed states for buttons
- [ ] Disabled states for all form elements

### 10.2 Micro-interactions
- [ ] Button click feedback animation
- [ ] Panel collapse/expand animation
- [ ] Modal entrance/exit animation
- [ ] Toast slide-in animation
- [ ] Loading spinner animations
- [ ] Skeleton loader shimmer effect

### Fake/Placeholder Data
- [ ] 3-5 sample video clips in Media Library
- [ ] 3-5 sample clips placed on timeline
- [ ] Fake metadata (durations, sizes, resolutions)
- [ ] Placeholder thumbnails
- [ ] Sample waveform data (if showing waveforms)

### 10.4 Feedback & Validation
- [ ] Form validation states (visual only)
- [ ] Error message styling
- [ ] Success confirmation styling
- [ ] Input focus indicators
- [ ] Helpful inline hints

---

## 11. Accessibility

### 11.1 Keyboard Navigation
- [ ] Tab order through all interactive elements
- [ ] Focus indicators visible
- [ ] Keyboard shortcuts document
- [ ] Escape key closes modals/dropdowns
- [ ] Enter/Space activates buttons
- [ ] Arrow keys navigate lists

### 11.2 Screen Reader Support
- [ ] ARIA labels on all interactive elements
- [ ] ARIA live regions for dynamic content
- [ ] Proper heading hierarchy
- [ ] Alt text for images/icons
- [ ] Form labels associated with inputs

### 11.3 Visual Accessibility
- [ ] Minimum touch target sizes (44x44px)
- [ ] Color not the only indicator
- [ ] High contrast mode support
- [ ] Font scaling support
- [ ] Focus visible indicators

---

## 12. Customization System

### 12.1 CSS Variables/Tokens
- [ ] Export all customizable values as CSS variables
- [ ] Generate Tailwind config dynamically based on settings
- [ ] Hot-reload theme changes without restart
- [ ] Theme preview in real-time

### 12.2 Settings Persistence
- [ ] Save all settings to localStorage
- [ ] Settings sync across app instances
- [ ] Export/import settings as JSON
- [ ] Reset to defaults functionality

### 12.3 Runtime Theme Switching
- [ ] Theme change applies instantly
- [ ] Smooth transition when changing themes
- [ ] Preserve all customizations
- [ ] Undo theme changes

---

## 13. Documentation & Handoff

### 13.1 Style Guide
- [ ] Document all components
- [ ] Show usage examples
- [ ] Display all variants
- [ ] List all customizable properties

### 13.2 Design Tokens Reference
- [ ] Color palette reference
- [ ] Typography reference
- [ ] Spacing scale reference
- [ ] Component sizing reference

### 13.3 Component Library Story
- [ ] Create Storybook or similar
- [ ] Interactive component playground
- [ ] Test different themes easily
- [ ] Export component assets

---

## Success Criteria

- ✅ Complete visual UI structure with all panels and layouts
- ✅ Fully functional settings page with all customization options
- ✅ All UI components created and styled
- ✅ Responsive design working across window sizes
- ✅ Beautiful, modern, professional appearance
- ✅ Smooth animations and transitions throughout
- ✅ Keyboard and screen reader accessible
- ✅ No actual video processing or functionality
- ✅ Fake data for realistic UI preview
- ✅ Highly customizable via settings page

---

## Notes

- **No Backend Logic**: This task list intentionally excludes all functional implementation. Components should use dummy data.
- **Focus on Polish**: Since there's no functionality, extra attention should be paid to visual polish and customization.
- **Test Thoroughly**: Test all settings combinations, window sizes, themes, and interaction states.
- **Document Everything**: Future developers implementing functionality need clear understanding of UI structure.
- **Iterate Quickly**: Since there's no backend, UI iterations should be fast. Experiment with different layouts and styles.
- **Realistic Placeholders**: Use realistic dummy data so the UI looks like the final product will.

---

**Document Version:** v1.0  
**Author:** Generated for ClipForge UI Setup  
**Created:** January 2025
**Related:** Based on `clipforge_mvp_tasklist.md` Sections 2 & 10

