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

L'icône `icon.svg` représente un **trou noir stylisé** qui absorbe les contenus, symbolisant la collecte automatique et le stockage des conversations IA.

### Design

- **Trou noir central** : Cercle noir avec gradient radial (noir profond au centre, dégradé vers bleu foncé)
- **Disque d'accrétion** : Halo violet/bleu (#6366f1, #8b5cf6) autour du trou noir, représentant la matière qui spiralent
- **Particules absorbées** : Petits points bleus et violets (#60a5fa, #a78bfa) positionnés en spirale convergente, symbolisant les conversations qui sont "absorbées" et sauvegardées
- **Style** : Minimaliste et moderne, optimisé pour être lisible même en 16x16 pixels

### Métaphore

Le trou noir symbolise :
- **Absorption** : Collecte automatique des conversations (Beast Mode)
- **Conservation** : Stockage de tout le contenu dans un seul endroit
- **Centralisation** : Toutes les conversations IA rassemblées et organisées

### Génération automatique

Utiliser le script Node.js pour générer les PNG depuis le SVG :

```bash
npm install --save-dev sharp  # Si pas déjà installé
node scripts/generate-icons.js
```

Vous pouvez modifier le SVG selon vos préférences de design.
