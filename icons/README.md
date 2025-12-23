# Icônes de l'extension

Les icônes doivent être au format PNG avec les tailles suivantes :
- `icon16.png` : 16x16 pixels
- `icon48.png` : 48x48 pixels
- `icon128.png` : 128x128 pixels

## Génération des icônes depuis le SVG

### Option 1 : Utiliser ImageMagick (si installé)

```bash
# Convertir le SVG en PNG aux différentes tailles
convert -background none icons/icon.svg -resize 16x16 icons/icon16.png
convert -background none icons/icon.svg -resize 48x48 icons/icon48.png
convert -background none icons/icon.svg -resize 128x128 icons/icon128.png
```

### Option 2 : Utiliser un convertisseur en ligne

1. Ouvrir `icon.svg` dans un éditeur SVG ou navigateur
2. Exporter en PNG aux tailles requises :
   - 16x16 pour `icon16.png`
   - 48x48 pour `icon48.png`
   - 128x128 pour `icon128.png`

### Option 3 : Utiliser un outil de design

- Figma, Adobe Illustrator, ou Inkscape
- Exporter le SVG aux tailles PNG requises

### Option 4 : Icônes placeholder temporaires

Pour tester rapidement, vous pouvez créer des icônes placeholder simples avec un script Node.js ou utiliser des outils en ligne comme :
- https://realfavicongenerator.net/
- https://www.favicon-generator.org/

## Icône actuelle

L'icône `icon.svg` représente un réseau neuronal stylisé sur fond bleu (#4285f4), symbolisant l'intelligence artificielle et la collecte de conversations.

Vous pouvez modifier le SVG selon vos préférences de design.
