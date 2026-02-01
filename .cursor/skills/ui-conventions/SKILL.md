# MyVocab PWA UI Conventions

This skill documents UI patterns and conventions used in the MyVocab PWA application.

## Content Type Abbreviations

Content types use single-letter abbreviations for compact display in badges, chips, and menus.

| Content Type  | Abbreviation | Full Label    | Icon  |
|---------------|--------------|---------------|-------|
| Vocabulary    | **V**        | Vocabulary    | book  |
| Idiom         | **I**        | Idiom         | globe |
| Phrasal Verb  | **P**        | Phrasal Verb  | tag   |
| Quote         | **Q**        | Quote         | info  |

### When to Use Abbreviations

**Use abbreviations (V, I, P, Q) for:**
- Badge/chip components in cards
- Floating action button menu items
- "Add as" suggestion buttons
- Any compact UI element

**Use full labels for:**
- Filter dropdowns (users need clarity when filtering)
- Form labels and placeholders
- Delete confirmation messages
- Page titles (e.g., "Add Vocabulary")

### Implementation

Content type display configuration is centralized in:

```
src/constants/contentTypes.ts
```

Use these helper functions:

```typescript
import { 
  getContentTypeAbbr,    // Returns "V", "I", "P", "Q"
  getContentTypeLabel,   // Returns "Vocabulary", "Idiom", etc.
  getContentTypeDisplay  // Returns { label, abbr, icon }
} from '../constants/contentTypes';

// Example usage in Badge (use circular for single characters)
<Badge 
  variant="success"
  circular
  title={getContentTypeLabel(contentType)}
>
  {getContentTypeAbbr(contentType)}
</Badge>
```

### Circular Badges

Since content types use single-character abbreviations (V, I, P, Q), badges should be **circular**:

```tsx
// Use the `circular` prop for single-character badges
<Badge circular size="sm">I</Badge>  // Small circle (20x20px)
<Badge circular size="md">I</Badge>  // Medium circle (24x24px)
<Badge circular size="lg">I</Badge>  // Large circle (32x32px)
```

### Accessibility

Always include the full label as a `title` attribute for tooltips:

```tsx
<Badge circular title="Idiom">I</Badge>
<Button title="Vocabulary">V</Button>
```

## VocabCard Layout

### Collapsed View (Simple Mode)
```
┌─────────────────────────────────────────┐
│ (I) kick the bucket           ∨  ✎  🗑 │  ← Circle | Text | Actions (inline)
├─────────────────────────────────────────┤
│ /kɪk ðə ˈbʌkɪt/ idiom                  │  ← IPA + part of speech
│ To die; to pass away.                   │  ← Description (truncated)
└─────────────────────────────────────────┘
```

### Expanded View (Details Mode)
```
┌─────────────────────────────────────────┐
│                            ∧  ✎  🗑    │  ← Actions only (right-aligned)
├─────────────────────────────────────────┤
│ (I) kick the bucket                     │  ← Circle | Text (inline, bigger)
│ /kɪk ðə ˈbʌkɪt/ idiom                  │  ← IPA + part of speech
│                                         │
│ DEFINITION                              │
│ To die; to pass away.                   │
│                                         │
│ EXAMPLES                                │
│ │ Example sentence 1                    │
│ │ Example sentence 2                    │
└─────────────────────────────────────────┘
```

Note: `(I)` represents a circular badge with the single-character abbreviation.

## Navigation Headers

All secondary pages use consistent header style:

```
┌─────────────────────────────────────────┐
│ <  Page Title                           │  ← Back icon + title (inline)
│    Optional subtitle                    │
└─────────────────────────────────────────┘
```

The back button is a simple `<` chevron icon that links to home.

## Floating Action Button (FAB)

The FAB displays a speed dial menu with abbreviations:

```
          ┌────────┐
          │ ◇  P   │  ← Phrasal Verb
          └────────┘
          ┌────────┐
          │ ⊕  I   │  ← Idiom
          └────────┘
          ┌────────┐
          │ 📖 V   │  ← Vocabulary
          └────────┘
              ┌───┐
              │ + │  ← Main FAB button
              └───┘
```

## Color Coding

Content type badges use semantic colors:

| Type         | Badge Variant | Color       |
|--------------|---------------|-------------|
| Vocabulary   | primary       | Blue        |
| Idiom        | success       | Green       |
| Phrasal Verb | warning       | Amber/Orange|
| Quote        | info          | Cyan        |

## Related Files

- `src/constants/contentTypes.ts` - Content type configuration
- `src/components/molecules/VocabCard.tsx` - Card component
- `src/components/molecules/FloatingActionButton.tsx` - FAB component
- `src/components/organisms/VocabList.tsx` - List with "Add as" suggestions
