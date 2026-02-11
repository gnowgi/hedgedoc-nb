---
title: HedgeDoc Features Demo
description: A showcase of HedgeDoc's markdown features
tags:
  - demo
  - features
  - hedgedoc
---

# HedgeDoc Features Demo

Welcome to **HedgeDoc** — a real-time collaborative markdown editor. This note showcases the features available.

## Text Formatting

You can write **bold**, *italic*, ~~strikethrough~~, and `inline code`.

> This is a blockquote. Use it to highlight important information or quotes.

## Lists

### Unordered
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

### Ordered
1. Step one
2. Step two
3. Step three

### Task Lists
- [x] Learn markdown basics
- [x] Try HedgeDoc
- [ ] Explore the nodeBook extension
- [ ] Collaborate with others

## Links

- [nodeBook Knowledge Graphs](/n/nodeBook) — try the interactive CNL graph demo
- [HedgeDoc Documentation](https://docs.hedgedoc.org)

## Tables

| Element | Symbol | Atomic Number |
|---------|--------|---------------|
| Hydrogen | H | 1 |
| Helium | He | 2 |
| Lithium | Li | 3 |
| Carbon | C | 6 |
| Oxygen | O | 8 |

## Code Blocks

```javascript
function greet(name) {
  return `Hello, ${name}! Welcome to HedgeDoc.`;
}

console.log(greet('World'));
```

```python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(10)))
```

## Math

Inline math: $E = mc^2$

Block math:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

## Images

You can drag and drop images directly into the editor, or use standard markdown image syntax.

## Real-time Collaboration

HedgeDoc supports real-time collaborative editing. Share the URL of any note and edit together with others simultaneously.

---

*This is a demo note for HedgeDoc-NB. Edit it freely or create your own notes!*
