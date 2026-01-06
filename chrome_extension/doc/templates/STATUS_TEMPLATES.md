# Status des Templates et Configurations d'Extraction

## Vue d'ensemble

Ce document liste tous les domaines supportés par l'extension et leur statut concernant :
- **Configuration dans extractor.ts** : XPath ou logique d'extraction configurée
- **Template HTML** : Fichier template HTML disponible dans `doc/templates/`
- **Settings par défaut** : Activé dans `beast_enabled_per_domain`
- **URL Detector** : Détecté dans `url-detector.ts`

---

## Domaines Supportés

### ✅ ChatGPT (Complètement configuré)

| Domaine | Extractor | Template | Settings | URL Detector |
|---------|-----------|----------|----------|--------------|
| `chat.openai.com` | ✅ | ❌ | ✅ | ✅ |
| `chatgpt.com` | ✅ | ❌ | ✅ | ✅ |
| `www.chatgpt.com` | ✅ | ❌ | ✅ | ✅ |

**Status** : ✅ Fonctionnel - Extraction configurée avec XPath standard
**Note** : Pas de template nécessaire (XPath simple et stable)

---

### ✅ Perplexity (Complètement configuré)

| Domaine | Extractor | Template | Settings | URL Detector |
|---------|-----------|----------|----------|--------------|
| `www.perplexity.ai` | ✅ | ✅ | ✅ | ✅ |
| `perplexity.ai` | ✅ | ❌ | ❌ | ❌ |

**Status** : ✅ Fonctionnel - Template disponible et extraction configurée
**Template** : `perplexity.html` existe
**Note** : `perplexity.ai` (sans www) n'est pas dans les settings par défaut

---

### ✅ Kimi (Partiellement configuré)

| Domaine | Extractor | Template | Settings | URL Detector |
|---------|-----------|----------|----------|--------------|
| `www.kimi.com` | ✅ | ❌ | ❌ | ✅ |
| `kimi.com` | ✅ | ❌ | ❌ | ✅ |
| `kimi.moonshot.cn` | ❌ | ❌ | ❌ | ✅ |

**Status** : ⚠️ Extraction spéciale configurée mais pas activé par défaut
**Note** : Utilise `__kimi_special__` avec logique d'extraction dédiée
**Action requise** : Ajouter dans settings par défaut si nécessaire

---

### ✅ Claude (Complètement configuré)

| Domaine | Extractor | Template | Settings | URL Detector |
|---------|-----------|----------|----------|--------------|
| `claude.ai` | ✅ | ✅ | ✅ | ✅ |

**Status** : ✅ Fonctionnel - Template disponible et extraction configurée
**Template** : `claude.html` existe
**XPath** : Utilise le conteneur `main-content` avec extraction des messages utilisateur et réponses Claude
**Note** : Extraction basée sur `data-testid="user-message"` et `font-claude-response` classes

---

### ❌ Mistral (Non configuré)

| Domaine | Extractor | Template | Settings | URL Detector |
|---------|-----------|----------|----------|--------------|
| `chat.mistral.ai` | ❌ | ❌ | ✅ | ✅ |

**Status** : ❌ **NÉCESSITE CONFIGURATION**
**Action requise** : 
1. Ajouter configuration XPath dans `extractor.ts`
2. Créer template HTML `mistral.html` si nécessaire
3. Tester l'extraction

---

### ❌ DeepSeek (Non configuré)

| Domaine | Extractor | Template | Settings | URL Detector |
|---------|-----------|----------|----------|--------------|
| `chat.deepseek.com` | ❌ | ❌ | ✅ | ✅ |

**Status** : ❌ **NÉCESSITE CONFIGURATION**
**Action requise** : 
1. Ajouter configuration XPath dans `extractor.ts`
2. Créer template HTML `deepseek.html` si nécessaire
3. Tester l'extraction

---

### ❌ Qwen (Non configuré)

| Domaine | Extractor | Template | Settings | URL Detector |
|---------|-----------|----------|----------|--------------|
| `chat.qwen.ai` | ❌ | ❌ | ✅ | ✅ |

**Status** : ❌ **NÉCESSITE CONFIGURATION**
**Action requise** : 
1. Ajouter configuration XPath dans `extractor.ts`
2. Créer template HTML `qwen.html` si nécessaire
3. Tester l'extraction

---

### ❌ Manus (Non configuré)

| Domaine | Extractor | Template | Settings | URL Detector |
|---------|-----------|----------|----------|--------------|
| `manus.im` | ❌ | ❌ | ✅ | ✅ |

**Status** : ❌ **NÉCESSITE CONFIGURATION**
**Action requise** : 
1. Ajouter configuration XPath dans `extractor.ts`
2. Créer template HTML `manus.html` si nécessaire
3. Tester l'extraction

---

### ❌ Grok (Non configuré)

| Domaine | Extractor | Template | Settings | URL Detector |
|---------|-----------|----------|----------|--------------|
| `grok.com` | ❌ | ❌ | ✅ | ✅ |

**Status** : ❌ **NÉCESSITE CONFIGURATION**
**Action requise** : 
1. Ajouter configuration XPath dans `extractor.ts`
2. Créer template HTML `grok.html` si nécessaire
3. Tester l'extraction

---

## Résumé des Actions Requises

### 🔴 Priorité Haute - Domaines activés mais non configurés

Ces domaines sont dans les settings par défaut mais n'ont pas de configuration d'extraction :

1. **Mistral** (`chat.mistral.ai`)
2. **DeepSeek** (`chat.deepseek.com`)
3. **Qwen** (`chat.qwen.ai`)
4. **Manus** (`manus.im`)
5. **Grok** (`grok.com`)

### 🟡 Priorité Moyenne - Domaines partiellement configurés

1. **Kimi** - Extraction configurée mais pas activé dans settings par défaut
2. **Perplexity** - `perplexity.ai` (sans www) manquant dans settings

### 🟢 Priorité Basse - Améliorations optionnelles

1. Créer des templates HTML pour ChatGPT (si nécessaire pour tests)
2. Ajouter variantes de domaines (avec/sans www) pour cohérence

---

## Processus de Configuration

Pour chaque domaine manquant :

1. **Analyser la structure HTML** de la page de conversation
2. **Identifier les XPath** pour :
   - Titre de la conversation
   - Messages individuels
3. **Créer un template HTML** (optionnel mais recommandé pour tests)
4. **Ajouter la configuration** dans `extractor.ts`
5. **Tester l'extraction** sur une vraie page
6. **Ajuster les XPath** si nécessaire

---

## Notes

- Les templates HTML servent principalement pour :
  - Tests et développement
  - Documentation de la structure
  - Validation des XPath
  
- Les XPath peuvent être configurés via l'UI Settings sans modifier le code

- Les domaines avec extraction spéciale (comme Kimi) nécessitent une fonction dédiée
