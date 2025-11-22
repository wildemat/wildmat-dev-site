# Sass Quick Reference Guide

Quick reference for common Sass patterns used in this project.

## 🎨 Variables

### Using Variables

```scss
@use '../abstracts' as *;

.element {
  color: $brand-color;
  background: $light-grey;
  font-family: $text-font-stack;
}
```

### Common Variables

```scss
// Colors
$brand-color
$light-grey
$mid-grey
$dark-grey
$success-color
$warning-color
$error-color

// Typography
$text-font-stack
$code-font-stack
$base-font-size
$base-line-height

// Layout
$max-width
```

## 🔧 Functions

### Spacing Function

```scss
.element {
  margin: spacing('md');      // 24px
  padding: spacing('sm');     // 16px
  gap: spacing('xs');         // 8px
}
```

### Font Functions

```scss
h1 {
  font-size: font-size('h1');           // 2.5rem
  font-weight: font-weight('bold');     // 700
}
```

### Z-Index Function

```scss
.modal {
  z-index: z('modal');        // 9000
}
.header {
  z-index: z('header');       // 7000
}
```

### Color Functions

```scss
.button {
  background: $brand-color;
  
  &:hover {
    background: shade($brand-color, 15%);  // Darken
  }
  
  &:disabled {
    background: tint($brand-color, 50%);   // Lighten
  }
}
```

### Utility Functions

```scss
// Convert px to rem
font-size: rem(24px);        // 1.5rem

// Get nested map value
$value: map-deep-get($map, 'key1', 'key2');
```

## 🎭 Mixins

### Responsive Mixins

```scss
// Min-width (mobile-first)
@include respond-to('medium') {
  padding: spacing('lg');
}

// Max-width
@include respond-below('medium') {
  display: none;
}

// Between breakpoints
@include respond-between('medium', 'large') {
  width: 80%;
}
```

### Hover States

```scss
.link {
  @include on-event {
    color: $brand-color;
    text-decoration: underline;
  }
}

// Include self in selector
.button {
  @include on-event($self: true) {
    background: $brand-color;
  }
}
```

### Focus Ring

```scss
.button {
  @include focus-ring;
}

// Custom color and offset
.link {
  @include focus-ring($brand-color, 4px);
}
```

### Layout Mixins

```scss
// Container
.section {
  @include container;
}

// Container with custom max-width
.narrow-section {
  @include container(960px);
}

// Center with flexbox
.centered {
  @include flex-center;
}
```

### Typography Mixins

```scss
// Font smoothing
body {
  @include font-smoothing;
}

// Truncate text
.title {
  @include truncate;
}

// Multi-line truncate
.description {
  @include line-clamp(3);
}
```

### Reset Mixins

```scss
// Button reset
button {
  @include button-reset;
}

// Link reset
a {
  @include link-reset;
}

// List reset
ul {
  @include list-reset;
}
```

### Other Utility Mixins

```scss
// Visually hidden (accessible)
.sr-only {
  @include visually-hidden;
}

// Clearfix
.container {
  @include clearfix;
}

// Aspect ratio
.video-container {
  @include aspect-ratio(16, 9);
}

// Hover transition
.button {
  @include hover-transition(background-color) {
    background-color: $brand-color;
  }
}

// When inside context
.element {
  @include when-inside('.dark-mode') {
    color: white;
  }
}
```

## 📐 Spacing Scale

```scss
spacing('xxs')  // 4px
spacing('xs')   // 8px
spacing('sm')   // 16px
spacing('md')   // 24px
spacing('lg')   // 32px
spacing('xl')   // 48px
spacing('xxl')  // 64px
```

## 📱 Breakpoints

```scss
// Available breakpoints
'small'   // 320px
'medium'  // 768px
'large'   // 1024px
'xlarge'  // 1280px

// Usage
@include respond-to('medium') {
  // Styles for 768px and up
}

@include respond-below('large') {
  // Styles below 1024px
}

@include respond-between('medium', 'large') {
  // Styles between 768px and 1023px
}
```

## 🎯 Common Patterns

### Responsive Typography

```scss
h1 {
  font-size: font-size('h1');
  
  @include respond-to('medium') {
    font-size: calc(font-size('h1') * 1.2);
  }
  
  @include respond-to('large') {
    font-size: calc(font-size('h1') * 1.4);
  }
}
```

### Card Component

```scss
.card {
  padding: spacing('md');
  background: white;
  border-radius: 8px;
  transition: all $base-duration $base-timing;
  
  @include respond-to('medium') {
    padding: spacing('lg');
  }
  
  @include on-event {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba($dark-grey, 0.1);
  }
}
```

### Grid Layout

```scss
.grid {
  display: grid;
  gap: spacing('md');
  grid-template-columns: 1fr;
  
  @include respond-to('medium') {
    grid-template-columns: repeat(2, 1fr);
    gap: spacing('lg');
  }
  
  @include respond-to('large') {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Button Variants

```scss
.button {
  @include button-reset;
  padding: spacing('xs') spacing('md');
  border-radius: 8px;
  font-weight: font-weight('medium');
  transition: all $base-duration $base-timing;
  
  @include focus-ring;
  
  &--primary {
    background: $brand-color;
    color: white;
    
    @include on-event {
      background: shade($brand-color, 15%);
    }
  }
  
  &--secondary {
    background: $light-grey;
    color: $dark-grey;
    
    @include on-event {
      background: $mid-grey;
    }
  }
}
```

### Sticky Header

```scss
.header {
  position: sticky;
  top: 0;
  z-index: z('header');
  background: white;
  border-bottom: 1px solid $mid-grey;
  
  &__container {
    @include container;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: spacing('sm');
    padding-bottom: spacing('sm');
    
    @include respond-to('medium') {
      padding-top: spacing('md');
      padding-bottom: spacing('md');
    }
  }
}
```

### Mobile Navigation

```scss
.nav {
  display: none;
  
  @include respond-to('medium') {
    display: flex;
    gap: spacing('md');
  }
  
  &__link {
    @include link-reset;
    padding: spacing('xs') spacing('sm');
    border-radius: 6px;
    transition: all $base-duration $base-timing;
    
    @include focus-ring;
    
    @include on-event {
      background: rgba($brand-color, 0.1);
      color: $brand-color;
    }
  }
}
```

## 🎨 Theme Variables

```scss
// Light mode (default)
:root {
  --color-brand: #{$brand-color};
  --color-text: #{$dark-grey};
  --color-background: #ffffff;
}

// Dark mode
@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #{$light-grey};
    --color-background: #{$dark-grey};
  }
}

// Usage
.element {
  color: var(--color-text);
  background: var(--color-background);
}
```

## 📝 BEM Naming Convention

```scss
// Block
.card {}

// Element
.card__title {}
.card__content {}
.card__footer {}

// Modifier
.card--featured {}
.card--large {}
.card__title--bold {}

// Combined
.card--featured .card__title {}
```

## ⚡ Performance Tips

```scss
// Use @use instead of @import
@use '../abstracts' as *;

// Namespace imports
@use '../abstracts/variables' as vars;
@use '../abstracts/mixins' as mx;

.element {
  color: vars.$brand-color;
  @include mx.respond-to('medium') {}
}

// Use !default for library variables
$custom-color: blue !default;

// Keep selectors specific but not too nested (max 3 levels)
.nav {
  .nav__item {
    .nav__link {} // Stop here
  }
}
```

## 🔍 Debugging

```scss
// Output value for debugging
@debug spacing('md');

// Warning for incorrect usage
@if not map-has-key($breakpoints, $size) {
  @warn 'Breakpoint not found: #{$size}';
}

// Error for critical issues
@if $size < 0 {
  @error 'Size must be positive';
}
```

---

**💡 Tip**: Keep this reference handy while developing. Most patterns follow the Sass Guidelines best practices.

