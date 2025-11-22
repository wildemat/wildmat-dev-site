# Styles Architecture Guide

This project follows the **7-1 Sass Architecture Pattern** as outlined in the [Sass Guidelines](https://sass-guidelin.es/#architecture).

## 📁 Project Structure

```
src/
├── styles/
│   ├── abstracts/          # Variables, functions, mixins (no CSS output)
│   │   ├── _variables.scss # Color palette, spacing, typography
│   │   ├── _functions.scss # Sass functions for calculations
│   │   ├── _mixins.scss    # Reusable mixins for responsive design
│   │   └── _index.scss     # Forward all abstracts
│   │
│   ├── base/               # Reset and base styles
│   │   ├── _reset.scss     # Modern CSS reset
│   │   ├── _typography.scss# Base typography styles
│   │   └── _index.scss
│   │
│   ├── components/         # Component-specific styles
│   │   ├── _button.scss    # Button component styles
│   │   ├── _card.scss      # Card component styles
│   │   ├── _form.scss      # Form elements
│   │   ├── _badge.scss     # Badge component
│   │   └── _index.scss
│   │
│   ├── layout/             # Layout components
│   │   ├── _header.scss    # Header/navigation styles
│   │   ├── _footer.scss    # Footer styles
│   │   ├── _grid.scss      # Grid system utilities
│   │   ├── _navigation.scss# Navigation patterns
│   │   └── _index.scss
│   │
│   ├── pages/              # Page-specific styles
│   │   ├── _home.scss      # Home page styles
│   │   ├── _blog.scss      # Blog page styles
│   │   └── _index.scss
│   │
│   ├── themes/             # Theme variations
│   │   ├── _default.scss   # Default theme (light/dark)
│   │   └── _index.scss
│   │
│   ├── vendors/            # Third-party CSS
│   │   └── _index.scss
│   │
│   └── main.scss           # Main entry point (imports all)
│
├── components/             # React components
│   ├── ui/                 # shadcn-style UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   │
│   ├── layout/             # Layout components
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   │
│   ├── blog/               # Blog-specific components
│   │   └── BlogCard.tsx
│   │
│   └── sections/           # Page sections
│       └── Hero.tsx
│
├── lib/                    # Utility functions
│   └── utils.ts            # cn() for class merging
│
└── index.css               # Tailwind CSS + shadcn variables
```

## 🎨 Design System

### Colors

The color system uses HSL values for better manipulation:

- **Brand Color**: `hsl(222, 100%, 61%)` - Primary blue
- **Success**: `hsl(145, 63%, 42%)` - Green
- **Warning**: `hsl(45, 100%, 51%)` - Yellow
- **Error**: `hsl(348, 100%, 61%)` - Red

### Spacing

Based on an **8px baseline grid**:

- `xxs`: 4px
- `xs`: 8px
- `sm`: 16px
- `md`: 24px
- `lg`: 32px
- `xl`: 48px
- `xxl`: 64px

### Typography

Font sizes using a modular scale:

- `h1`: 2.5rem (40px)
- `h2`: 2rem (32px)
- `h3`: 1.75rem (28px)
- `h4`: 1.5rem (24px)
- `h5`: 1.25rem (20px)
- `h6`: 1rem (16px)

### Breakpoints

Mobile-first responsive breakpoints:

- `small`: 320px
- `medium`: 768px
- `large`: 1024px
- `xlarge`: 1280px

## 🔧 Using Sass Mixins

### Responsive Design

```scss
@use 'abstracts' as *;

.my-component {
  padding: spacing('sm');
  
  @include respond-to('medium') {
    padding: spacing('md');
  }
  
  @include respond-to('large') {
    padding: spacing('lg');
  }
}
```

### Hover States

```scss
.my-button {
  @include on-event {
    background-color: $brand-color;
  }
}
```

### Focus Ring

```scss
.my-link {
  @include focus-ring($brand-color);
}
```

### Container

```scss
.page-section {
  @include container;
}
```

## 🎯 Using Sass Functions

### Spacing

```scss
.element {
  margin-bottom: spacing('md'); // 24px
  padding: spacing('sm'); // 16px
}
```

### Font Size

```scss
h1 {
  font-size: font-size('h1'); // 2.5rem
}
```

### Z-Index

```scss
.modal {
  z-index: z('modal'); // 9000
}
```

### Color Manipulation

```scss
.button {
  background-color: $brand-color;
  
  &:hover {
    background-color: shade($brand-color, 15%);
  }
}
```

## 🌈 Tailwind + Sass Integration

This project uses **both** Tailwind CSS and Sass:

- **Tailwind**: For utility classes and rapid prototyping
- **Sass**: For custom component styles and design system

### When to Use Each

**Use Tailwind when:**
- Building layouts quickly
- Applying utility classes
- Using shadcn components

**Use Sass when:**
- Creating custom component styles
- Building complex animations
- Maintaining design system consistency

## 📱 Responsive Design

All components are built mobile-first and fully responsive:

1. **Mobile** (320px+): Base styles
2. **Tablet** (768px+): Adjusted layouts
3. **Desktop** (1024px+): Full layouts
4. **Large Desktop** (1280px+): Maximum widths

## ♿ Accessibility

All components follow WCAG 2.1 AA standards:

- Proper focus states using `@include focus-ring`
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Color contrast ratios meet standards

## 🚀 Getting Started

### Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

### Adding New Styles

1. **Variables**: Add to `abstracts/_variables.scss`
2. **Mixins**: Add to `abstracts/_mixins.scss`
3. **Components**: Create new file in `components/`
4. **Pages**: Add page-specific styles to `pages/`

### Example: Adding a New Component Style

```scss
// src/styles/components/_alert.scss
@use '../abstracts' as *;

.alert {
  padding: spacing('sm');
  border-radius: 8px;
  
  &--success {
    background-color: tint($success-color, 90%);
    color: shade($success-color, 20%);
  }
  
  &--error {
    background-color: tint($error-color, 90%);
    color: shade($error-color, 20%);
  }
  
  @include respond-to('medium') {
    padding: spacing('md');
  }
}
```

Then import it in `components/_index.scss`:

```scss
@forward 'alert';
```

## 📚 Best Practices

### Following Sass Guidelines

1. **BEM Naming**: Use Block Element Modifier naming
2. **!default Flag**: Use for variables in public APIs
3. **DRY Principle**: Use mixins and functions to avoid repetition
4. **Mobile-First**: Always start with mobile styles
5. **Specificity**: Keep specificity low (max 3 levels)
6. **Documentation**: Comment complex code

### Class Naming

```scss
// Good
.card {}
.card__title {}
.card__title--large {}

// Avoid
.cardTitle {}
.CardTitle {}
.card_title {}
```

### File Organization

- Each file should have a single responsibility
- Use `_index.scss` files to forward imports
- Keep files under 200 lines when possible
- Group related styles together

## 🔍 Utilities

Helper classes are available in `main.scss`:

```html
<!-- Spacing -->
<div class="mt-md mb-lg px-sm"></div>

<!-- Text alignment -->
<div class="text-center"></div>

<!-- Visibility -->
<div class="visually-hidden"></div>
```

## 🎨 Theming

Dark mode is supported via CSS custom properties:

```scss
// Automatically applies based on system preference
@media (prefers-color-scheme: dark) {
  // Dark mode styles
}

// Or manually toggle with class
.dark-mode {
  // Dark mode styles
}
```

## 📖 Resources

- [Sass Guidelines](https://sass-guidelin.es/)
- [7-1 Pattern Documentation](https://sass-guidelin.es/#architecture)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

## 🤝 Contributing

When contributing:

1. Follow the existing architecture
2. Use the Sass mixins and functions
3. Keep styles DRY
4. Test responsive behavior
5. Ensure accessibility standards
6. Document complex code

---

**Built with ❤️ following Sass Guidelines and modern web standards**

