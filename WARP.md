# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Next.js 15 project using the App Router architecture with TypeScript, TailwindCSS v4, and Turbopack for fast builds. The project uses React 19 and follows modern Next.js conventions with the `src/app` directory structure.

## Essential Commands

### Development
```bash
npm run dev          # Start development server with Turbopack (http://localhost:3000)
npm run build        # Build for production with Turbopack
npm start           # Start production server
npm run lint        # Run ESLint
```

### Package Management
```bash
npm install         # Install dependencies
npm ci             # Clean install for CI/production
```

## Architecture & Structure

### App Router Structure
- Uses Next.js 15 App Router (`src/app/` directory)
- `layout.tsx` defines the root layout with Geist fonts
- `page.tsx` files define route components
- TypeScript path mapping: `@/*` → `./src/*`

### Styling System
- **TailwindCSS v4**: Uses new `@import "tailwindcss"` syntax in `globals.css`
- **Custom CSS Variables**: Dark/light mode theming via CSS custom properties
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google`
- **Theme Configuration**: Inline theme configuration in `globals.css`

### Build System
- **Turbopack**: Used for both development and production builds (faster than Webpack)
- **TypeScript**: Strict mode enabled with Next.js plugin
- **ESLint**: Configured with Next.js Core Web Vitals and TypeScript rules

### Key Configuration Files
- `next.config.ts`: Next.js configuration (currently minimal)
- `tsconfig.json`: TypeScript with strict mode and path mapping
- `eslint.config.mjs`: Flat config with Next.js rules
- `postcss.config.mjs`: TailwindCSS PostCSS integration

## Development Notes

### Next.js 15 Specifics
- Uses App Router (not Pages Router)
- React 19 with new features enabled
- Turbopack is the default bundler for faster builds
- TypeScript configuration optimized for App Router

### TailwindCSS v4 Migration
- Uses new `@import "tailwindcss"` syntax instead of separate directives
- Inline theme configuration with `@theme` directive
- CSS custom properties for theming integration

### Font Loading
- Geist fonts are loaded optimally via `next/font/google`
- Font variables are defined in layout and used throughout the app
- Automatic font optimization and loading

### Development Server
- Runs on http://localhost:3000 by default
- Hot reloading enabled via Turbopack
- Automatic TypeScript checking during development
