# Wildmat Dev Site

A modern, responsive personal blog and portfolio website built with React, TypeScript, Tailwind CSS, and Sass following the 7-1 architecture pattern.

## 🚀 Features

- ✨ **Modern Stack**: React 18 + TypeScript + Vite
- 🎨 **Dual Styling**: Tailwind CSS for utilities + Sass for custom styles
- 📐 **7-1 Architecture**: Organized Sass following [Sass Guidelines](https://sass-guidelin.es/#architecture)
- 🎯 **shadcn-inspired**: Beautiful UI components with CVA
- 📱 **Fully Responsive**: Mobile-first design with breakpoints
- ♿ **Accessible**: WCAG 2.1 AA compliant
- 🌗 **Dark Mode**: System preference support
- ⚡ **Optimized**: Fast builds with Vite
- 🎯 **Type Safe**: Full TypeScript support

## 📁 Project Structure

```
wildmat-dev-site/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Base UI components (Button, Card, Badge)
│   │   ├── layout/         # Layout components (Header, Footer)
│   │   ├── blog/           # Blog-specific components
│   │   └── sections/       # Page sections (Hero)
│   │
│   ├── styles/             # 7-1 Sass architecture
│   │   ├── abstracts/      # Variables, functions, mixins
│   │   ├── base/           # Reset, typography
│   │   ├── components/     # Component styles
│   │   ├── layout/         # Layout styles
│   │   ├── pages/          # Page-specific styles
│   │   ├── themes/         # Theme variations
│   │   ├── vendors/        # Third-party CSS
│   │   └── main.scss       # Main entry point
│   │
│   ├── lib/                # Utilities
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Tailwind + shadcn config
│
├── public/                 # Static assets
├── tailwind.config.ts      # Tailwind configuration
├── vite.config.ts          # Vite configuration
├── STYLES_GUIDE.md         # Detailed styles documentation
└── package.json
```

## 🛠️ Tech Stack

### Core
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool

### Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **Sass** - CSS preprocessor with 7-1 architecture
- **class-variance-authority** - Component variants
- **clsx** & **tailwind-merge** - Class name utilities

### UI Components
- **shadcn/ui inspired** - Accessible component system
- **Lucide React** - Icon library

## 🏃 Getting Started

### Prerequisites

- Node.js 18+
- Yarn (or npm/pnpm)

### Installation

```bash
# Clone the repository
git clone https://github.com/wildemat/wildmat-dev-site.git
cd wildmat-dev-site

# Install dependencies
yarn install

# Start development server
yarn dev
```

The site will be available at `http://localhost:5173`

### Build for Production

```bash
# Build the project
yarn build

# Preview production build
yarn preview
```

## 📚 Documentation

### Quick Start Guides

- **[Styles Guide](./STYLES_GUIDE.md)** - Comprehensive guide to the Sass architecture
- **Components** - See `src/components/` for component examples
- **Styling** - Check `src/styles/` for Sass organization

### Key Concepts

#### 7-1 Sass Architecture

This project follows the 7-1 pattern with 7 folders and 1 main file:

1. **abstracts/** - Tools and helpers (no CSS output)
2. **base/** - Foundation styles
3. **components/** - Component-specific styles
4. **layout/** - Layout patterns
5. **pages/** - Page-specific styles
6. **themes/** - Theme variations
7. **vendors/** - Third-party CSS

#### Design System

**Colors:**
- Brand: `hsl(222, 100%, 61%)`
- Success: `hsl(145, 63%, 42%)`
- Warning: `hsl(45, 100%, 51%)`
- Error: `hsl(348, 100%, 61%)`

**Spacing:** 8px baseline grid (4px, 8px, 16px, 24px, 32px, 48px, 64px)

**Breakpoints:**
- Small: 320px
- Medium: 768px
- Large: 1024px
- XLarge: 1280px

### Using Sass Mixins

```scss
@use 'abstracts' as *;

.component {
  // Responsive
  @include respond-to('medium') {
    padding: spacing('lg');
  }
  
  // Hover states
  @include on-event {
    color: $brand-color;
  }
  
  // Focus ring
  @include focus-ring;
  
  // Container
  @include container;
}
```

### Using React Components

```tsx
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello World</CardTitle>
        <Badge variant="default">New</Badge>
      </CardHeader>
      <CardContent>
        <Button variant="primary" size="lg">
          Click Me
        </Button>
      </CardContent>
    </Card>
  );
}
```

## 🎨 Customization

### Adding New Colors

Edit `src/styles/abstracts/_variables.scss`:

```scss
$custom-color: hsl(200, 80%, 50%) !default;
```

### Creating New Components

1. Create Sass file: `src/styles/components/_mycomponent.scss`
2. Create React file: `src/components/ui/MyComponent.tsx`
3. Import in `src/styles/components/_index.scss`

### Modifying Breakpoints

Edit `src/styles/abstracts/_variables.scss`:

```scss
$breakpoints: (
  'small': 320px,
  'medium': 768px,
  'large': 1024px,
  'xlarge': 1280px,
  'xxlarge': 1536px,  // Add new breakpoint
) !default;
```

## 🌐 Responsive Design

All components are mobile-first and fully responsive:

```scss
// Mobile first (default)
.element {
  padding: spacing('sm');
}

// Tablet
@include respond-to('medium') {
  .element {
    padding: spacing('md');
  }
}

// Desktop
@include respond-to('large') {
  .element {
    padding: spacing('lg');
  }
}
```

## ♿ Accessibility

- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus visible states on all interactive elements
- Color contrast ratios meet WCAG AA standards
- Screen reader friendly

## 📦 Available Scripts

```bash
# Development
yarn dev          # Start dev server
yarn build        # Build for production
yarn preview      # Preview production build

# Code Quality
yarn lint         # Run ESLint
yarn type-check   # Run TypeScript compiler check
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Follow the existing architecture patterns
2. Use Sass mixins and functions for consistency
3. Keep components small and focused
4. Write accessible markup
5. Test responsive behavior
6. Ensure no linting errors

## 📝 Best Practices

### Sass
- Use BEM naming convention
- Keep specificity low (max 3 levels)
- Use `@use` instead of `@import`
- Leverage mixins and functions
- Comment complex code

### React
- Use TypeScript for type safety
- Keep components pure when possible
- Use the `cn()` utility for class merging
- Follow shadcn/ui patterns for consistency

### Performance
- Code split with React.lazy when needed
- Optimize images (use WebP when possible)
- Minimize CSS with PurgeCSS (Tailwind handles this)
- Use Vite's build optimization

## 📖 Resources

- [Sass Guidelines](https://sass-guidelin.es/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)
- [shadcn/ui](https://ui.shadcn.com/)

## 📄 License

MIT License - feel free to use this project for your own portfolio or blog!

## 👤 Author

**Matt Wilde**
- Email: mwilde345@gmail.com
- GitHub: [@wildemat](https://github.com/wildemat)

---

**Built with ❤️ using modern web technologies and best practices**

⭐ Star this repo if you found it helpful!
