<!-- 7d915f28-b0d8-4d28-8184-9bb5649e1f44 e03a9559-f94d-4dc2-84fd-3c016dc00b2a -->
# Floating Clip Detail Popup

1. Update `src/renderer/components/features/MediaLibrary/MediaLibrary.jsx` refactor: add a ref to the library panel, watch global pointer/focus events to clear selection when clicks land outside, and swap the detail mount point to use the new floating container.
2. Restyle `src/renderer/components/features/MediaLibrary/ClipDetailDrawer.jsx` so it renders as a compact floating card (max height, scrollable body, shadow) while keeping rename/usage logic intact.
3. Wire up escape-key handling and ensure closing actions clear the media store selection; verify media selection resets when interacting with the video player, timeline, or settings panels.
4. Position popup in top-left of preview window with dynamic positioning.
5. Clear media library selection when timeline clips are selected.

### To-dos

- [x] Add outside-interaction handling and floating detail container to MediaLibrary component
- [x] Restyle ClipDetailDrawer into a floating popup card
- [x] Handle escape key and closing interactions to clear selection, then sanity-check flows
- [x] Position popup in top-left of preview window
- [x] Clear media library selection when timeline clips are selected
- [x] Clear media library selection when dragging clips to timeline
- [x] Fix popup positioning to stay within viewport bounds
