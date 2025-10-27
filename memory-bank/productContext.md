# Product Context: ClipForge

## Why This Project Exists

Video content creation has become essential for creators, educators, and professionals. However, existing solutions often suffer from:
- Complicated interfaces that overwhelm users with unnecessary features
- Web-based editors that require constant internet connectivity
- Premium desktop applications that are prohibitively expensive
- Feature-heavy applications that slow down the core editing workflow

ClipForge addresses these pain points by providing a focused, desktop-native video editor that prioritizes the essential editing workflow.

## Problems It Solves

### 1. Accessibility & Simplicity
Many video editors expose too many features at once, overwhelming newcomers and slowing down experienced users who just need basic editing. ClipForge strips away complexity to focus on the core creative loop.

### 2. Desktop Performance
Web-based editors depend on internet connectivity and can struggle with local file handling. ClipForge operates entirely on the desktop, providing fast access to local files and consistent performance.

### 3. Cost & Distribution
Professional video editing software often requires expensive licenses. ClipForge provides a capable editing suite that can be packaged as a single executable file.

### 4. Screen Recording Integration
Many creators need to record their screen as part of the editing workflow. ClipForge integrates screen and webcam recording directly into the editing experience.

## How It Should Work

### User Journey 1: Quick Tutorial Video
1. Creator launches ClipForge
2. Clicks "Record Screen" and selects capture source (desktop or window)
3. Optionally enables webcam for picture-in-picture
4. Records 5-minute tutorial demonstration
5. Recorded clip appears in Media Library
6. Drag clip to timeline
7. Trim beginning and end for clean start/stop
8. Click Export → Choose 1080p resolution
9. Save tutorial_video.mp4 to desktop

### User Journey 2: Combining Multiple Clips
1. Creator has 3 separate video clips to combine
2. Drag all 3 clips into ClipForge window
3. Clips appear in Media Library with thumbnails
4. Drag clips onto timeline in desired order
5. Adjust trim points on middle clip to remove unwanted section
6. Preview entire timeline with play button
7. Export combined video as single MP4

### User Journey 3: Webcam Overlay on Screen Recording
1. Creator wants to show their face while demonstrating software
2. Records screen capture and webcam simultaneously
3. Webcam automatically overlays in corner via picture-in-picture mode
4. Both video tracks appear on timeline
5. Can adjust webcam position or size in timeline
6. Export with both layers properly composited

## User Experience Goals

### Core Principles
1. **Immediate Feedback**: Every action provides instant visual response
2. **Reduced Friction**: Minimize clicks and steps between intent and result
3. **Error Prevention**: Validate inputs and guide users away from mistakes
4. **Professional Output**: Export videos that meet platform standards (720p, 1080p)
5. **Predictable Performance**: Smooth 30 FPS playback and reliable export times

### Interface Philosophy
- **Clean & Minimal**: Dark mode interface that doesn't compete with video content
- **Contextual Controls**: Show relevant options based on current selection
- **Visual Hierarchies**: Timeline clearly shows clip relationships and timing
- **Discoverability**: Tooltips and hints for first-time users without cluttering the UI
- **Keyboard Efficiency**: Common actions have keyboard shortcuts for power users

## Target Users

### Primary Users
- **Content Creators & Streamers**: Creating gameplay highlights, tutorial content, or stream clips
- **Educators & Online Instructors**: Recording lessons, demonstrations, and educational content
- **Professionals**: Creating product demos, presentations, or sales videos
- **Indie Developers**: Producing demo videos and promotional content

### User Skills & Expectations
- Basic familiarity with file management and desktop applications
- Understanding of simple video editing concepts (trim, combine clips)
- Expectations for native app performance and responsiveness
- Desire for professional-looking output without complexity

## Competitive Positioning

ClipForge occupies the space between:
- **Too Simple**: Built-in screen recorders with no editing
- **Too Complex**: Adobe Premiere, Final Cut Pro with overwhelming interfaces

Differentiators:
- Desktop cursor editor with native performance
- Integrated recording and editing in one workflow
- Modern attributes UI using Tailwind CSS
- Fair focus on essential editing operations
- Cross-platform availability (Windows, macOS, Linux)

