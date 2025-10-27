# Project Brief: ClipForge

## Vision
ClipForge is a production-grade desktop video editor that enables creators to record, edit, and export videos seamlessly on desktop. The application delivers an intuitive, high-performance, native desktop experience focused on the core creative workflow.

## Core Mission
Build a reliable, cross-platform desktop video editor using Electron that emphasizes the essential creative loop: **Record → Import → Arrange → Export**.

## Primary Goals
1. Create a working Electron desktop application for Windows, macOS, and Linux
2. Support screen, window, and webcam recording capabilities
3. Enable multi-clip timeline editing with drag-and-drop functionality
4. Provide real-time video preview and playback
5. Export videos to MP4 format with reliable encoding
6. Package as native, distributable executables

## Target Outcome
A fully functional video editing application that allows content creators, educators, and professionals to:
- Quickly record tutorial or demo videos
- Combine multiple video clips into cohesive content
- Edit with trim, split, and reorder operations
- Export professional-quality videos for platforms like YouTube or LinkedIn

## Scope Boundaries

### In Scope
- Desktop application built with Electron framework
- MP4/MOV/WebM file import and preview
- Video timeline editing (trim, split, delete, drag-and-drop)
- Screen recording via Electron's desktopCapturer API
- Webcam recording via MediaDevices API
- Video export using FFmpeg
- Real-time playback and scrubbing
- Basic multi-track support (video + overlay)
- Native installer packaging for Windows and macOS

### Out of Scope (MVP)
- Cloud storage integration
- Advanced effects or transitions
- AI-assisted editing features
- Multi-language localization
- Collaborative editing features

## Success Criteria
- MVP feature set operational and stable
- Reliable export pipeline using FFmpeg
- Timeline can handle 10+ clips responsively
- Exported video plays at 30+ FPS without stutter
- Application launches in under 5 seconds
- Exports 2-minute clips in under 30 seconds
- Memory usage stable under 1GB during editing
- No crashes during import/export workflows

## Key Constraints
- Must follow Electron security best practices (contextIsolation, sandbox, no nodeIntegration)
- Cross-platform compatibility (Windows, macOS, Linux)
- Performance targets for smooth 30 FPS playback
- FFmpeg integration for reliable video processing
- Modern, minimal UI design (dark mode focused)

## Project Metadata
- **Project Name:** ClipForge
- **Author:** Ben Burnett
- **Start Date:** October 2025
- **Current Phase:** Initial Setup & Foundation
- **Primary Technology Stack:** Electron, React, Tailwind CSS, FFmpeg

